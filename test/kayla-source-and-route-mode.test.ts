import { describe, it, expect, vi } from 'vitest';
import type { KaylaAIProvider, KaylaChatResponse, KaylaAIChunk } from '../src/data/kayla/types';
import { toKaylaSource, toKaylaSources } from '../src/lib/kayla/sources';

/**
 * Phase 6 source traceability (Part 5) and route-mode labeling (Part 6/21).
 *
 * routeMode is internal-facing evidence, not a visitor-facing claim: it lets
 * a test or a live smoke check prove which lane actually produced an answer
 * (deterministic / retrieval / provider-accepted / provider-replaced /
 * provider-failed-fallback) instead of inferring it from prose.
 */

describe('Structured source derivation', () => {
  it('classifies a project page as kind "project"', () => {
    const source = toKaylaSource({ type: 'app', title: 'CodeForge', snippet: '', id: 'app-codeforge', route: '/projects/codeforge', sourceType: 'canonical' });
    expect(source).toEqual({ label: 'CodeForge', kind: 'project', route: '/projects/codeforge' });
  });

  it('classifies a GitHub link as kind "github"', () => {
    const source = toKaylaSource({ type: 'github', title: 'CodeForge GitHub', snippet: '', id: 'github-codeforge', route: 'https://github.com/Forger-Digital-Solutions/CodeForge', sourceType: 'github' });
    expect(source?.kind).toBe('github');
    expect(source?.url).toBe('https://github.com/Forger-Digital-Solutions/CodeForge');
    expect(source?.route).toBeUndefined();
  });

  it('classifies a non-project site page as kind "page"', () => {
    const source = toKaylaSource({ type: 'company', title: 'About FDS', snippet: '', id: 'fds-company', route: '/about', sourceType: 'canonical' });
    expect(source?.kind).toBe('page');
  });

  it('falls back to kind "canonical" when a fact has no route to point to', () => {
    const source = toKaylaSource({ type: 'general', title: 'Scope boundary', snippet: '', id: 'scope-boundary', sourceType: 'canonical' });
    expect(source?.kind).toBe('canonical');
    expect(source?.route).toBeUndefined();
    expect(source?.url).toBeUndefined();
  });

  it('never fabricates a source for a result with nothing attributable', () => {
    expect(toKaylaSource({ type: 'general', title: 'No results', snippet: '', sourceType: 'none' })).toBeUndefined();
    expect(toKaylaSources([{ type: 'general', title: 'No results', snippet: '', sourceType: 'none' }])).toEqual([]);
  });

  it('caps the number of sources returned', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ type: 'app' as const, title: `App ${i}`, snippet: '', id: `app-${i}`, route: `/projects/app-${i}`, sourceType: 'canonical' }));
    expect(toKaylaSources(many, 3)).toHaveLength(3);
  });
});

describe('routeMode: deterministic and retrieval lanes', () => {
  it('labels a settled canonical fact as deterministic', async () => {
    const { handleKaylaChat } = await import('../src/lib/kayla/handler');
    const { createKaylaConfig } = await import('../src/lib/kayla/config');
    const offline = { ...createKaylaConfig({}), enabled: false, provider: '' };
    const endpoint = { providerConfig: { provider: '' }, kaylaConfig: offline, consumeRequestAllowance: async () => true, consumeAIAllowance: async () => false };
    const { response } = await handleKaylaChat({ message: 'Can I download CodeForge?', history: [], context: { route: '/', pageType: 'home' } }, endpoint);
    const body = response as KaylaChatResponse;
    expect(body.routeMode).toBe('deterministic');
    expect(body.sourceLinks?.length).toBeGreaterThan(0);
  });

  it('labels an honest no-match as no_results', async () => {
    const { handleKaylaChat } = await import('../src/lib/kayla/handler');
    const { createKaylaConfig } = await import('../src/lib/kayla/config');
    const offline = { ...createKaylaConfig({}), enabled: false, provider: '' };
    const endpoint = { providerConfig: { provider: '' }, kaylaConfig: offline, consumeRequestAllowance: async () => true, consumeAIAllowance: async () => false };
    const { response } = await handleKaylaChat({ message: 'What is the capital of France?', history: [], context: { route: '/', pageType: 'home' } }, endpoint);
    const body = response as KaylaChatResponse;
    expect(body.routeMode).toBe('no_results');
  });
});

let scriptedBehaviour: 'accept' | 'reject' | 'fail' = 'accept';

vi.mock('../src/lib/kayla/provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/kayla/provider')>();
  const scripted: KaylaAIProvider = {
    id: 'scripted',
    name: 'Scripted Test Provider',
    async isAvailable() { return true; },
    async chat() {
      if (scriptedBehaviour === 'fail') throw new Error('PROVIDER_FAILURE');
      if (scriptedBehaviour === 'reject') return { content: 'CodeForge is version 9.0 and costs $49.' };
      return { content: 'CodeForge and Kayla AI Publisher are both FDS products with different purposes.' };
    },
    async *stream(): AsyncIterable<KaylaAIChunk> {
      if (scriptedBehaviour === 'fail') { yield { type: 'error', error: 'PROVIDER_FAILURE' }; return; }
      const text = scriptedBehaviour === 'reject' ? 'CodeForge is version 9.0 and costs $49.' : 'CodeForge and Kayla AI Publisher are both FDS products with different purposes.';
      for (const word of text.split(' ')) yield { type: 'content', content: word + ' ' };
      yield { type: 'done' };
    }
  };
  return { ...actual, createAIProvider: () => scripted };
});

const { handleKaylaChat, streamKaylaChat } = await import('../src/lib/kayla/handler');
const { createKaylaConfig } = await import('../src/lib/kayla/config');

function aiEndpoint() {
  const aiConfig = { ...createKaylaConfig({}), enabled: true, provider: 'mock', apiKey: 'test' };
  return { providerConfig: { provider: 'mock' }, kaylaConfig: aiConfig, consumeRequestAllowance: async () => true, consumeAIAllowance: async () => true };
}

describe('routeMode: provider lanes (non-streaming)', () => {
  it('labels a verified provider answer as provider_accepted', async () => {
    scriptedBehaviour = 'accept';
    const { response } = await handleKaylaChat({ message: 'Compare CodeForge and Kayla AI Publisher.', history: [], context: { route: '/', pageType: 'home' } }, aiEndpoint());
    const body = response as KaylaChatResponse;
    expect(body.mode).toBe('ai');
    expect(body.routeMode).toBe('provider_accepted');
    expect(body.sourceLinks).toBeDefined();
  });

  it('labels a rejected-and-replaced provider answer as provider_replaced', async () => {
    scriptedBehaviour = 'reject';
    const { response } = await handleKaylaChat({ message: 'Compare CodeForge and Kayla AI Publisher.', history: [], context: { route: '/', pageType: 'home' } }, aiEndpoint());
    const body = response as KaylaChatResponse;
    expect(body.mode).toBe('local');
    expect(body.routeMode).toBe('provider_replaced');
    expect(body.answer).not.toContain('9.0');
    expect(body.answer).not.toContain('$49');
  });

  it('labels a provider exception as provider_failed_fallback', async () => {
    scriptedBehaviour = 'fail';
    const { response } = await handleKaylaChat({ message: 'Compare CodeForge and Kayla AI Publisher.', history: [], context: { route: '/', pageType: 'home' } }, aiEndpoint());
    const body = response as KaylaChatResponse;
    expect(body.mode).toBe('local');
    expect(body.routeMode).toBe('provider_failed_fallback');
  });
});

async function collectStream(behaviour: 'accept' | 'reject' | 'fail', message: string) {
  scriptedBehaviour = behaviour;
  const chunks: Record<string, unknown>[] = [];
  for await (const chunk of streamKaylaChat({ message, history: [], context: { route: '/', pageType: 'home' } }, aiEndpoint())) {
    chunks.push(JSON.parse(chunk));
  }
  return chunks;
}

describe('routeMode: provider lanes (streaming)', () => {
  it('the terminal chunk of an accepted stream carries provider_accepted and sources', async () => {
    const chunks = await collectStream('accept', 'Compare CodeForge and Kayla AI Publisher.');
    const last = chunks[chunks.length - 1];
    expect(last.done).toBe(true);
    expect(last.routeMode).toBe('provider_accepted');
    expect(Array.isArray(last.sourceLinks)).toBe(true);
  });

  it('a rejected stream is replaced with a chunk carrying provider_replaced', async () => {
    const chunks = await collectStream('reject', 'Compare CodeForge and Kayla AI Publisher.');
    const replaced = chunks.find((c) => c.replace === true);
    expect(replaced).toBeDefined();
    expect(replaced?.routeMode).toBe('provider_replaced');
  });

  it('a failed stream falls back with a chunk carrying provider_failed_fallback', async () => {
    const chunks = await collectStream('fail', 'Compare CodeForge and Kayla AI Publisher.');
    const fallback = chunks.find((c) => c.replace === true);
    expect(fallback).toBeDefined();
    expect(fallback?.routeMode).toBe('provider_failed_fallback');
  });
});
