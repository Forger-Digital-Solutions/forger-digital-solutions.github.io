import { describe, it, expect, vi } from 'vitest';
import type { KaylaAIProvider, KaylaAIChunk, KaylaChatResponse } from '../src/data/kayla/types';
import type { KaylaDiagnostics } from '../src/lib/kayla/diagnostics';

/**
 * A model that emits scaffolding instead of an answer must be replaced by the
 * same pipeline that replaces a model that lies.
 *
 * This is a regression, not a hypothetical: production request 77b88132 served
 * `<|tool_call_start|>[FDS_Knowledge(query='…')]` to a visitor with
 * routeMode 'provider_accepted'. Canonical verification passed it because
 * scaffolding asserts nothing, so there was nothing to contradict.
 *
 * Scripted provider, unmodified pipeline.
 */

let scriptedReply = '';

vi.mock('../src/lib/kayla/provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/kayla/provider')>();
  const scaffolding: KaylaAIProvider = {
    id: 'scaffolding-emitter',
    name: 'Scaffolding Test Provider',
    async isAvailable() { return true; },
    async chat() { return { content: scriptedReply }; },
    async *stream(): AsyncIterable<KaylaAIChunk> {
      for (const word of scriptedReply.split(' ')) yield { type: 'content', content: word + ' ' };
      yield { type: 'done' };
    }
  };
  return { ...actual, createAIProvider: () => scaffolding };
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

async function askWithModelSaying(reply: string, question: string) {
  scriptedReply = reply;
  const diagnostics: KaylaDiagnostics[] = [];
  const { response } = await handleKaylaChat(
    { message: question, history: [], context: { route: '/', pageType: 'home' } },
    aiEndpoint((d) => diagnostics.push(d))
  );
  return { body: response as KaylaChatResponse, diagnostics: diagnostics[0] };
}

const OBSERVED_LIVE = "<|tool_call_start|>[FDS_Knowledge(query='GEMS Training Grounds relationship GEMS research lineages generalist software engineering quantitative reasoning multimodal'), FDS_Knowledge(query='GEMS lineages')]";

describe('scaffolding never reaches the visitor', () => {
  it('replaces the exact output that reached production', async () => {
    const { body, diagnostics } = await askWithModelSaying(
      OBSERVED_LIVE,
      'How are GEMS and Training Grounds related?'
    );
    expect(body.answer).not.toMatch(/tool_call_start|FDS_Knowledge\(/);
    expect(body.answer.length).toBeGreaterThan(20);
    expect(body.routeMode).toBe('provider_replaced');
    expect(diagnostics.providerOutcome).toBe('rejected_replaced');
    expect(diagnostics.verificationKinds).toContain('control_token');
  });

  const replies: [string, string][] = [
    ['control_token', '<|im_start|>assistant\nCodeForge is free.'],
    ['tool_call_scaffolding', '<tool_call>{"name":"FDS_Knowledge"}</tool_call>'],
    ['reasoning_leak', '<think>They want CodeForge.</think> CodeForge is free.'],
    ['empty_answer', '   '],
    ['pathological_repetition', Array(5).fill('CodeForge is free.').join(' ')]
  ];

  for (const [kind, reply] of replies) {
    it(`replaces ${kind} and reports it in diagnostics`, async () => {
      const { body, diagnostics } = await askWithModelSaying(reply, 'What is CodeForge?');
      expect(body.routeMode).toBe('provider_replaced');
      expect(diagnostics.verificationKinds).toContain(kind);
    });
  }

  it('replaces scaffolding on the streaming lane too', async () => {
    scriptedReply = OBSERVED_LIVE;
    let final: Record<string, unknown> = {};
    for await (const raw of streamKaylaChat(
      { message: 'How are GEMS and Training Grounds related?', history: [], context: { route: '/', pageType: 'home' } },
      aiEndpoint()
    )) {
      const chunk = JSON.parse(raw);
      if (chunk.done) final = chunk;
      // Buffer-then-validate means no scaffolding should ever be streamed out.
      expect(String(chunk.content ?? '')).not.toMatch(/tool_call_start/);
    }
    expect(final.routeMode).toBe('provider_replaced');
  });

  it('still accepts a clean answer, so the check is not rejecting everything', async () => {
    const { body } = await askWithModelSaying(
      'CodeForge is a free-first autonomous software-engineering platform for Windows.',
      'What is CodeForge?'
    );
    expect(body.routeMode).toBe('provider_accepted');
  });
});
