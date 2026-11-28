import { describe, it, expect, vi } from 'vitest';
import type { KaylaAIProvider, KaylaAIChunk, KaylaChatResponse } from '../src/data/kayla/types';
import { createKaylaConfig } from '../src/lib/kayla/config';
import { handleKaylaChat } from '../src/lib/kayla/handler';
import { canonicalAnswer } from '../src/data/kayla/answers';
import { verifyAgainstCanon } from '../src/lib/kayla/verify';
import { validateSafeAction } from '../src/lib/kayla/action-validator';

/**
 * "Where should I start?" is a starter chip. It used to fall through to the
 * live provider, spending the shared daily AI allowance and, when the
 * provider was rate-limited, degrading to a generic fallback with a Forge
 * Control snippet. It is now a deterministic, Hub-first canonical answer.
 */

vi.mock('../src/lib/kayla/provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/kayla/provider')>();
  const scripted: KaylaAIProvider = {
    id: 'scripted',
    name: 'Scripted Test Provider',
    async isAvailable() { return true; },
    async chat() { return { content: 'Scripted provider answer about a general topic.', resolvedModel: 'scripted-model-1' }; },
    async *stream(): AsyncIterable<KaylaAIChunk> {
      yield { type: 'content', content: 'Scripted provider answer.' };
      yield { type: 'done' };
    }
  };
  return { ...actual, createAIProvider: () => scripted };
});

const liveEndpoint = (consumeAIAllowance = vi.fn(async () => true)) => ({
  providerConfig: { provider: 'groq', model: 'qwen/test-free-model' },
  kaylaConfig: { ...createKaylaConfig({}), enabled: true, provider: 'groq', model: 'qwen/test-free-model', apiKey: 'test' },
  consumeRequestAllowance: async () => true,
  consumeAIAllowance
});

async function ask(message: string, consumeAIAllowance = vi.fn(async () => true)) {
  const { response } = await handleKaylaChat(
    { message, history: [], context: { route: '/', pageType: 'home' } },
    liveEndpoint(consumeAIAllowance)
  );
  return response as KaylaChatResponse;
}

const START_PHRASES = [
  'Where should I start?',
  'where do i start',
  'Where should I begin?',
  'Where do I begin?',
  'How do I get started?',
  'How should I begin?',
  "Where should I start if I'm new?",
  "What's the best place to start?",
  'Where to start?',
  'Hi Kayla, where should I start?',
  'Where should I start with FDS?'
];

const NOT_START_PHRASES = [
  'Where should I start with CodeForge?',
  'How do I get started with the Studio Intelligence Hub?',
  'Where do I start learning C++?',
  'Where should I start a business?',
  'How do I start the game?',
  'Are you SOC 2 certified?',
  'Write me a poem about space.'
];

describe('Where should I start? — deterministic Hub-first answer', () => {
  it('answers every start phrasing from canon, settled, with Hub-first actions', () => {
    for (const q of START_PHRASES) {
      const ans = canonicalAnswer(q, { route: '/', pageType: 'home' }, []);
      expect(ans, q).toBeDefined();
      expect(ans!.title, q).toBe('Where to Start');
      expect(ans!.settled, q).toBe(true);
      expect(ans!.actions?.map((a) => a.label), q).toEqual(['Studio Intelligence Hub', 'Book a Pilot Call', 'Trust Center']);
      expect(ans!.actions?.map((a) => a.href), q).toEqual(['/solutions/studio-intelligence-hub/', '/contact/?track=studio-intelligence-hub', '/trust/']);
      for (const act of ans!.actions || []) {
        const res = validateSafeAction(act, { strictCanonical: true });
        expect(res.valid, `${q}: ${JSON.stringify(res.violations)}`).toBe(true);
      }
      const verdict = verifyAgainstCanon(ans!.text);
      expect(verdict.ok, `${q}: ${JSON.stringify(verdict.violations)}`).toBe(true);
    }
  });

  it('states the honest pilot scope and makes no pricing or certification claims', () => {
    const { text } = canonicalAnswer('Where should I start?', { route: '/', pageType: 'home' }, [])!;
    expect(text).toMatch(/four-week pilot/);
    expect(text).toMatch(/Roblox Studio \(Luau\)/);
    expect(text).toMatch(/Unreal Engine \(C\+\+\)/);
    expect(text).toMatch(/in testing on FDS’s own projects/);
    expect(text).toMatch(/Read-only by design/);
    expect(text).toMatch(/its own AI provider API keys/);
    expect(text).toMatch(/Cursor MCP connection has been tested, while the full end-to-end workflow is still in testing/);
    expect(text).toMatch(/Blueprint logic indexing is not yet implemented/);
    expect(text).toMatch(/Forge Control is a separate FDS product in active development with no public release/);
    expect(text).not.toMatch(/\$\s?\d|per month|pricing is|price is/i);
    expect(text).not.toMatch(/\b(?:is|are)\s+(?:SOC\s*2|ISO\s*27001|HIPAA)\b|\bcertified\b/i);
    expect(text).not.toMatch(/generally available|available now|production[- ]ready/i);
  });

  it('serves the starter chip locally without spending the AI daily allowance', async () => {
    for (const q of START_PHRASES) {
      const consumeAIAllowance = vi.fn(async () => true);
      const response = await ask(q, consumeAIAllowance);
      expect(response.mode, q).toBe('local');
      expect(response.routeMode, q).toBe('deterministic');
      expect(response.answer, q).toMatch(/^Start with the FDS Studio Intelligence Hub/);
      expect((response.actions || []).map((a) => a.label), q).toEqual(['Studio Intelligence Hub', 'Book a Pilot Call', 'Trust Center']);
      expect((response.actions || []).map((a) => a.label), q).not.toContain('View Forge Control');
      expect(consumeAIAllowance, `${q} must not spend AI budget`).not.toHaveBeenCalled();
    }
  });

  it('does not capture unrelated or more specific questions', () => {
    for (const q of NOT_START_PHRASES) {
      const ans = canonicalAnswer(q, { route: '/', pageType: 'home' }, []);
      expect(ans?.title, q).not.toBe('Where to Start');
    }
  });
});
