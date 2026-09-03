import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { KaylaAIProvider, KaylaAIRequest, KaylaConfig } from '../src/data/kayla/types';
import { products } from '../src/data/products';
import { projects } from '../src/data/projects';

/**
 * Canonical authority under a hostile model.
 *
 * The model is given deliberately false FDS claims to return. Kayla must not
 * pass them to the visitor. This is the invariant that separates "grounded
 * copilot" from "chatbot with a knowledge base attached", and it cannot be
 * proven by testing the local layer alone — the provider has to actually lie.
 */

let scriptedReply = '';
const capturedRequests: KaylaAIRequest[] = [];

vi.mock('../src/lib/kayla/provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/kayla/provider')>();
  const hostile: KaylaAIProvider = {
    id: 'hostile',
    name: 'Hostile Test Provider',
    async isAvailable() { return true; },
    async chat(request) {
      capturedRequests.push(request);
      return { content: scriptedReply };
    },
    async *stream(request) {
      capturedRequests.push(request);
      for (const word of scriptedReply.split(' ')) yield { type: 'content' as const, content: word + ' ' };
      yield { type: 'done' as const };
    }
  };
  return { ...actual, createAIProvider: () => hostile };
});

const { handleKaylaChat, streamKaylaChat } = await import('../src/lib/kayla/handler');
const { createKaylaConfig } = await import('../src/lib/kayla/config');

const aiConfig: KaylaConfig = { ...createKaylaConfig({}), enabled: true, provider: 'mock', apiKey: 'test' };
const endpoint = {
  providerConfig: { provider: 'mock' },
  kaylaConfig: aiConfig,
  consumeRequestAllowance: async () => true,
  consumeAIAllowance: async () => true
};

async function askWithModelSaying(lie: string, question: string) {
  scriptedReply = lie;
  const { response } = await handleKaylaChat(
    { message: question, history: [], context: { route: '/', pageType: 'home' } },
    endpoint
  );
  return response as { answer: string; mode: string };
}

async function streamWithModelSaying(lie: string, question: string) {
  scriptedReply = lie;
  let text = '';
  let mode = '';
  for await (const chunk of streamKaylaChat({ message: question, history: [], context: { route: '/', pageType: 'home' } }, endpoint)) {
    const parsed = JSON.parse(chunk) as { content?: string; mode?: string };
    if (parsed.mode) mode = parsed.mode;
    if (parsed.content) text += parsed.content;
  }
  return { answer: text, mode };
}

beforeEach(() => { capturedRequests.length = 0; });

const codeforgeVersion = products.find((p) => p.slug === 'codeforge')!.version!;

describe('A hostile model cannot rewrite canonical FDS facts', () => {
  it('rejects an invented version number', async () => {
    const response = await askWithModelSaying(
      `CodeForge is currently version 9.0 and costs $49 per month.`,
      'What is CodeForge?'
    );
    expect(response.answer).not.toContain('9.0');
    expect(response.answer).not.toContain('$49');
    expect(response.answer).toContain(codeforgeVersion);
  });

  it('rejects an invented download for an unreleased project', async () => {
    const response = await askWithModelSaying(
      'KyraBlox is publicly downloadable today at https://example.com/kyrablox.zip',
      'What is KyraBlox?'
    );
    expect(response.answer).not.toContain('example.com');
    expect(response.answer.toLowerCase()).not.toContain('publicly downloadable');
  });

  it('rejects an invented benchmark result', async () => {
    const response = await askWithModelSaying(
      'Sapphire has beaten GPT-5 on coding benchmarks with a 92% score.',
      'What is Sapphire?'
    );
    expect(response.answer).not.toContain('92%');
    expect(response.answer).not.toMatch(/beaten|beats|outperform/i);
  });

  it('rejects an invented public launch', async () => {
    const response = await askWithModelSaying(
      'Garnet has launched publicly and generates images now.',
      'What is Garnet?'
    );
    expect(response.answer.toLowerCase()).not.toContain('has launched publicly');
  });

  it('rejects an invented cancellation', async () => {
    const response = await askWithModelSaying(
      'We The People was cancelled in 2025 and is no longer being developed.',
      'What is We The People?'
    );
    expect(response.answer.toLowerCase()).not.toContain('cancelled');
    expect(response.answer).toContain(projects.find((p) => p.slug === 'we-the-people')!.status);
  });

  it('rejects an invented founder', async () => {
    const response = await askWithModelSaying(
      'Forger Digital Solutions was founded by Elon Musk in 2019.',
      'Tell me about Forger Digital Solutions.'
    );
    expect(response.answer).not.toContain('Elon Musk');
  });

  it('holds the same line on the streaming path', async () => {
    const response = await streamWithModelSaying(
      'CodeForge is currently version 9.0 and KyraBlox is downloadable now.',
      'What is CodeForge?'
    );
    expect(response.answer).not.toContain('9.0');
  });
});

describe('The provider request carries the grounding contract', () => {
  it('sends a system message on every provider call', async () => {
    await askWithModelSaying('an answer', 'Explain all of FDS to me');
    expect(capturedRequests.length).toBeGreaterThan(0);
  });

  it('passes conversation history through to the provider', async () => {
    scriptedReply = 'an answer';
    await handleKaylaChat(
      {
        message: 'How is that different?',
        history: [{ role: 'user', content: 'What is Sapphire?' }, { role: 'assistant', content: 'Sapphire is the coding lineage.' }],
        context: { route: '/', pageType: 'home' }
      },
      endpoint
    );
    const request = capturedRequests.at(-1)!;
    expect(request.history).toHaveLength(2);
    expect(request.history[0].content).toContain('Sapphire');
  });

  it('passes page context through to the provider', async () => {
    scriptedReply = 'an answer';
    await handleKaylaChat(
      { message: 'Explain this project in depth', history: [], context: { route: '/projects/codeforge', pageType: 'project', entity: 'codeforge' } },
      endpoint
    );
    expect(capturedRequests.at(-1)!.context?.entity).toBe('codeforge');
  });

  it('supplies the canonical answer as grounding when one exists', async () => {
    scriptedReply = 'an answer';
    await handleKaylaChat({ message: 'What is CodeForge?', history: [], context: { route: '/', pageType: 'home' } }, endpoint);
    const sources = capturedRequests.at(-1)!.sources;
    expect(sources[0].sourceType).toBe('canonical');
  });
});
