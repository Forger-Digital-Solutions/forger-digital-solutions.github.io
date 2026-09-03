import { describe, it, expect, vi } from 'vitest';
import type { KaylaAIProvider, KaylaChatResponse, KaylaConfig } from '../src/data/kayla/types';
import { products } from '../src/data/products';

/**
 * Failure matrix. Every provider failure mode is driven through the real
 * handler and asserted on what the visitor ends up seeing: a grounded FDS
 * answer, never a stack trace, a hang, or a half-written wrong claim.
 */

type Behaviour =
  | { kind: 'ok'; text: string }
  | { kind: 'throw'; error: string }
  | { kind: 'stream-error'; error: string }
  | { kind: 'empty-stream' }
  | { kind: 'partial-then-lie' }
  | { kind: 'partial-then-die' };

let behaviour: Behaviour = { kind: 'ok', text: 'A grounded answer.' };

vi.mock('../src/lib/kayla/provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/kayla/provider')>();
  const provider: KaylaAIProvider = {
    id: 'scripted',
    name: 'Scripted Test Provider',
    async isAvailable() { return true; },
    async chat() {
      if (behaviour.kind === 'throw') throw new Error(behaviour.error);
      if (behaviour.kind === 'ok') return { content: behaviour.text };
      if (behaviour.kind === 'partial-then-lie') return { content: 'CodeForge is a platform. It is currently version 9.0.' };
      throw new Error('MALFORMED_RESPONSE');
    },
    async *stream() {
      if (behaviour.kind === 'stream-error') { yield { type: 'error' as const, error: behaviour.error }; return; }
      if (behaviour.kind === 'empty-stream') { yield { type: 'done' as const }; return; }
      if (behaviour.kind === 'throw') throw new Error(behaviour.error);
      if (behaviour.kind === 'partial-then-die') {
        yield { type: 'content' as const, content: 'CodeForge takes ownership of a repository task. ' };
        yield { type: 'content' as const, content: 'It plans, edits, and verifies' };
        yield { type: 'error' as const, error: 'TIMEOUT' };
        return;
      }
      if (behaviour.kind === 'partial-then-lie') {
        yield { type: 'content' as const, content: 'CodeForge is a free-first engineering platform. ' };
        yield { type: 'content' as const, content: 'It is currently version 9.0 and costs $49. ' };
        yield { type: 'done' as const };
        return;
      }
      for (const word of behaviour.text.split(' ')) yield { type: 'content' as const, content: word + ' ' };
      yield { type: 'done' as const };
    }
  };
  return { ...actual, createAIProvider: () => provider };
});

const { handleKaylaChat, streamKaylaChat } = await import('../src/lib/kayla/handler');
const { createKaylaConfig } = await import('../src/lib/kayla/config');

const aiOn: KaylaConfig = { ...createKaylaConfig({}), enabled: true, provider: 'mock', apiKey: 'test' };
const base = {
  providerConfig: { provider: 'mock' },
  consumeRequestAllowance: async () => true,
  consumeAIAllowance: async () => true
};

async function ask(message: string, config: Partial<typeof base> & { kaylaConfig?: KaylaConfig } = {}) {
  return handleKaylaChat({ message, history: [], context: { route: '/', pageType: 'home' } }, { ...base, kaylaConfig: aiOn, ...config });
}

async function askStream(message: string) {
  const chunks: Record<string, unknown>[] = [];
  let text = '';
  for await (const raw of streamKaylaChat({ message, history: [], context: { route: '/', pageType: 'home' } }, { ...base, kaylaConfig: aiOn })) {
    const chunk = JSON.parse(raw) as Record<string, unknown>;
    chunks.push(chunk);
    if (chunk.replace) text = String(chunk.content ?? '');
    else if (chunk.content) text += String(chunk.content);
  }
  return { text, chunks };
}

const codeforgeVersion = products.find((p) => p.slug === 'codeforge')!.version!;
const noStackTrace = (text: string) => expect(text).not.toMatch(/\bat .+\.(ts|js):\d+|Error:|stack/i);

describe('Failure matrix', () => {
  it('no provider configured: canonical answer still served', async () => {
    const { response } = await ask('What is CodeForge?', { kaylaConfig: { ...aiOn, enabled: false, provider: '' } });
    const body = response as KaylaChatResponse;
    expect(body.mode).toBe('local');
    expect(body.answer).toContain('CodeForge');
  });

  it('provider throws an HTTP failure: grounded fallback, no internals', async () => {
    behaviour = { kind: 'throw', error: 'PROVIDER_FAILURE' };
    const { status, response } = await ask('What is CodeForge?');
    const body = response as KaylaChatResponse;
    expect(status).toBe(200);
    expect(body.mode).toBe('local');
    expect(body.answer).toContain('CodeForge');
    noStackTrace(body.answer);
    expect(body.answer).not.toContain('PROVIDER_FAILURE');
  });

  it('provider times out: bounded, grounded fallback', async () => {
    behaviour = { kind: 'throw', error: 'TIMEOUT' };
    const { response } = await ask('What is KyraBlox?');
    const body = response as KaylaChatResponse;
    expect(body.mode).toBe('local');
    expect(body.answer).toContain('KyraBlox');
    expect(body.answer).not.toContain('TIMEOUT');
  });

  it('provider returns malformed output: safe fallback', async () => {
    behaviour = { kind: 'throw', error: 'MALFORMED_RESPONSE' };
    const { response } = await ask('What is GEMS?');
    const body = response as KaylaChatResponse;
    expect(body.mode).toBe('local');
    expect(body.answer.length).toBeGreaterThan(20);
  });

  it('provider asserts a false fact: canonical truth wins', async () => {
    behaviour = { kind: 'partial-then-lie' };
    const { response } = await ask('What is CodeForge?');
    const body = response as KaylaChatResponse;
    expect(body.answer).not.toContain('9.0');
    expect(body.answer).toContain(codeforgeVersion);
    expect(body.mode).toBe('local');
  });

  it('rate limit exceeded: 429 with a typed error', async () => {
    const { status, response } = await ask('What is CodeForge?', { consumeRequestAllowance: async () => false });
    expect(status).toBe(429);
    expect((response as { errorType: string }).errorType).toBe('RATE_LIMITED');
  });

  it('AI budget exhausted: canonical answer instead of an error', async () => {
    behaviour = { kind: 'ok', text: 'unused' };
    const { status, response } = await ask('What is KyraBlox?', { consumeAIAllowance: async () => false });
    const body = response as KaylaChatResponse;
    expect(status).toBe(200);
    expect(body.mode).toBe('local');
    expect(body.answer).toContain('KyraBlox');
  });

  it('empty prompt is rejected', async () => {
    const { status, response } = await ask('   ');
    expect(status).toBe(400);
    expect((response as { errorType: string }).errorType).toBe('VALIDATION_ERROR');
  });

  it('oversized prompt is rejected', async () => {
    const { status } = await ask('x'.repeat(50_000));
    expect(status).toBe(400);
  });

  it('unknown FDS fact is admitted, not invented', async () => {
    behaviour = { kind: 'ok', text: 'unused' };
    const { response } = await ask('How many employees does FDS have?');
    const body = response as KaylaChatResponse;
    expect(body.answer.toLowerCase()).toMatch(/not public|do not have|don't have|does not publish/);
    expect(body.answer).not.toMatch(/\b\d+\s*employees/i);
  });

  it('retrieval finds nothing: says so instead of guessing', async () => {
    behaviour = { kind: 'ok', text: 'unused' };
    const { response } = await ask('What is the capital of France?');
    const body = response as KaylaChatResponse;
    expect(body.answer).not.toContain('Paris');
  });
});

describe('Streaming failure behaviour', () => {
  it('stream error degrades to a grounded answer', async () => {
    behaviour = { kind: 'stream-error', error: 'PROVIDER_FAILURE' };
    const { text } = await askStream('What is CodeForge?');
    expect(text).toContain('CodeForge');
    noStackTrace(text);
  });

  it('empty stream is treated as a failure, not an empty answer', async () => {
    behaviour = { kind: 'empty-stream' };
    const { text } = await askStream('What is KyraBlox?');
    expect(text.length).toBeGreaterThan(20);
    expect(text).toContain('KyraBlox');
  });

  it('a false claim mid-stream never reaches the transcript', async () => {
    behaviour = { kind: 'partial-then-lie' };
    const { text, chunks } = await askStream('What is CodeForge?');
    // The replace chunk discards everything streamed so far.
    expect(chunks.some((chunk) => chunk.replace === true)).toBe(true);
    expect(text).not.toContain('9.0');
    expect(text).not.toContain('$49');
    expect(text).toContain(codeforgeVersion);
  });

  it('replaces partial text when the provider dies mid-stream', async () => {
    behaviour = { kind: 'partial-then-die' };
    const { text, chunks } = await askStream('What is CodeForge?');
    // Regression: the fallback used to be appended, leaving a half-finished
    // sentence followed by an apology.
    expect(chunks.some((chunk) => chunk.replace === true)).toBe(true);
    expect(text).not.toContain('It plans, edits, and verifies');
    expect(text).toContain('CodeForge');
  });

  it('emits no content chunk that fails verification', async () => {
    behaviour = { kind: 'partial-then-lie' };
    const { chunks } = await askStream('What is CodeForge?');
    const streamed = chunks.filter((chunk) => chunk.type === 'content').map((chunk) => String(chunk.content)).join('');
    expect(streamed).not.toContain('9.0');
    expect(streamed).not.toContain('$49');
  });
});
