import { describe, it, expect, vi } from 'vitest';
import type { KaylaAIProvider, KaylaAIChunk, KaylaChatResponse } from '../src/data/kayla/types';
import type { KaylaDiagnostics } from '../src/lib/kayla/diagnostics';

/**
 * Phase 7: a provider that hallucinates a *relationship* must be caught by the
 * same buffer-then-validate pipeline that already catches a hallucinated fact,
 * and its invented links must never reach the visitor's sources or actions.
 *
 * These drive the real handler with a scripted provider — the provider lies,
 * the pipeline is unmodified.
 */

let scriptedReply = '';

vi.mock('../src/lib/kayla/provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/kayla/provider')>();
  const hallucinating: KaylaAIProvider = {
    id: 'semantic-hallucinator',
    name: 'Semantic Hallucination Test Provider',
    async isAvailable() { return true; },
    async chat() { return { content: scriptedReply }; },
    async *stream(): AsyncIterable<KaylaAIChunk> {
      for (const word of scriptedReply.split(' ')) yield { type: 'content', content: word + ' ' };
      yield { type: 'done' };
    }
  };
  return { ...actual, createAIProvider: () => hallucinating };
});

const { handleKaylaChat, streamKaylaChat } = await import('../src/lib/kayla/handler');
const { createKaylaConfig } = await import('../src/lib/kayla/config');

function aiEndpoint(onDiagnostics?: (d: KaylaDiagnostics) => void) {
  return {
    providerConfig: { provider: 'mock' },
    kaylaConfig: { ...createKaylaConfig({}), enabled: true, provider: 'mock', apiKey: 'test' },
    consumeRequestAllowance: async () => true,
    consumeAIAllowance: async () => true,
    onDiagnostics
  };
}

async function askWithModelSaying(lie: string, question: string) {
  scriptedReply = lie;
  const diagnostics: KaylaDiagnostics[] = [];
  const { response } = await handleKaylaChat(
    { message: question, history: [], context: { route: '/', pageType: 'home' } },
    aiEndpoint((d) => diagnostics.push(d))
  );
  return { body: response as KaylaChatResponse, diagnostics: diagnostics[0] };
}

describe('A provider inventing a relationship is overruled', () => {
  it('rejects "Sapphire powers CodeForge" and replaces it with canonical text', async () => {
    const { body, diagnostics } = await askWithModelSaying(
      'Sapphire is the model powering the current free CodeForge release.',
      'How do GEMS and CodeForge relate?'
    );
    expect(body.answer).not.toMatch(/Sapphire is the model powering/i);
    expect(body.routeMode).toBe('provider_replaced');
    expect(diagnostics.providerOutcome).toBe('rejected_replaced');
    expect(diagnostics.verificationOutcome).toBe('rejected');
  });

  it('rejects "Garnet is built into Kayla"', async () => {
    const { body } = await askWithModelSaying(
      'Garnet is built into Kayla Copilot and powers this chat.',
      'What is Garnet?'
    );
    expect(body.answer).not.toMatch(/built into Kayla Copilot/i);
    expect(body.routeMode).toBe('provider_replaced');
  });

  it('rejects "Training Grounds is another name for CodeForge"', async () => {
    const { body, diagnostics } = await askWithModelSaying(
      'Training Grounds is another name for CodeForge.',
      'How are GEMS and Training Grounds related?'
    );
    expect(body.answer).not.toMatch(/another name for CodeForge/i);
    expect(diagnostics.verificationKinds).toContain('false_equivalence');
  });

  it('rejects an invented external download mirror', async () => {
    const { body } = await askWithModelSaying(
      'KyraBlox is downloadable from its official mirror at https://kyrablox-mirror.example/setup.exe',
      'Can I download KyraBlox?'
    );
    expect(body.answer).not.toContain('kyrablox-mirror.example');
  });

  it('holds the same line on the streaming path, with no unsafe text emitted', async () => {
    scriptedReply = 'Sapphire powers CodeForge and ships inside the released build.';
    let emitted = '';
    let replaced = false;
    for await (const chunk of streamKaylaChat(
      { message: 'How do GEMS and CodeForge relate?', history: [], context: { route: '/', pageType: 'home' } },
      aiEndpoint()
    )) {
      const parsed = JSON.parse(chunk) as { content?: string; replace?: boolean; routeMode?: string };
      if (parsed.replace) { replaced = true; emitted = parsed.content || ''; }
      else if (parsed.content) emitted += parsed.content;
    }
    expect(replaced).toBe(true);
    expect(emitted).not.toMatch(/Sapphire powers CodeForge/i);
  });
});

describe('Source and action integrity under a hostile provider', () => {
  it('never adopts a model-invented source URL', async () => {
    const { body } = await askWithModelSaying(
      'You can learn more at https://fake-fds-download.example and grab the installer there.',
      'Where do I learn about CodeForge?'
    );
    const serialized = JSON.stringify(body.sourceLinks ?? []);
    expect(serialized).not.toContain('fake-fds-download.example');
  });

  it('never adopts a model-invented action URL', async () => {
    const { body } = await askWithModelSaying(
      'Download it now from https://evil-mirror.example/codeforge.exe',
      'Where do I download CodeForge?'
    );
    const serialized = JSON.stringify(body.actions ?? []);
    expect(serialized).not.toContain('evil-mirror.example');
  });

  it('keeps every emitted source link canonical in shape', async () => {
    const { body } = await askWithModelSaying(
      'CodeForge and Kayla AI Publisher serve different purposes.',
      'Compare CodeForge and Kayla AI Publisher.'
    );
    for (const source of body.sourceLinks ?? []) {
      if (source.route) expect(source.route.startsWith('/')).toBe(true);
      if (source.url) expect(source.url.startsWith('https://')).toBe(true);
    }
  });
});

describe('Verification rejection does not poison later turns', () => {
  it('answers the next question from canonical state, not the rejected claim', async () => {
    scriptedReply = 'Sapphire powers CodeForge.';
    const first = await handleKaylaChat(
      { message: 'How do GEMS and CodeForge relate?', history: [], context: { route: '/', pageType: 'home' } },
      aiEndpoint()
    );
    const firstAnswer = (first.response as KaylaChatResponse).answer;

    // The visitor's transcript carries the *replacement*, which is what a real
    // client echoes back — the rejected text was never shown and never stored.
    scriptedReply = 'CodeForge is a released engineering platform.';
    const second = await handleKaylaChat(
      {
        message: 'Okay, what is CodeForge then?',
        history: [
          { role: 'user', content: 'How do GEMS and CodeForge relate?' },
          { role: 'assistant', content: firstAnswer }
        ],
        context: { route: '/', pageType: 'home' }
      },
      aiEndpoint()
    );
    const secondAnswer = (second.response as KaylaChatResponse).answer;
    expect(secondAnswer).not.toMatch(/Sapphire powers CodeForge/i);
    expect(secondAnswer.toLowerCase()).toContain('codeforge');
  });
});
