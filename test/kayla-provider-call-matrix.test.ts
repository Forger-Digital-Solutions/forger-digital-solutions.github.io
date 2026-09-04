import { describe, it, expect, vi } from 'vitest';
import type { KaylaAIProvider, KaylaAIChunk, KaylaChatResponse } from '../src/data/kayla/types';
import type { KaylaDiagnostics } from '../src/lib/kayla/diagnostics';

/**
 * Phase 8 adaptive-routing certification matrix (Part 2).
 *
 * kayla-adaptive-routing.test.ts already pins isProviderEligible() in
 * isolation. This certifies the end-to-end contract that actually reaches a
 * visitor: whether handleKaylaChat ever attempts the provider at all. The two
 * gates are not the same thing — a settled canonical answer (e.g. a filtered
 * project listing) short-circuits before isProviderEligible is ever called,
 * so isProviderEligible alone can say "true" for a question that never
 * reaches the provider in production. providerAttempted is the one signal
 * that cannot be fooled by that distinction.
 *
 * A scripted provider stands in for the network: it never contacts
 * OpenRouter, so this suite spends no provider quota and needs no live call
 * to prove which questions would spend it in production.
 */

vi.mock('../src/lib/kayla/provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/kayla/provider')>();
  const scripted: KaylaAIProvider = {
    id: 'scripted',
    name: 'Scripted Test Provider',
    async isAvailable() { return true; },
    async chat() {
      return { content: 'CodeForge and Kayla AI Publisher are both FDS products with different purposes.' };
    },
    async *stream(): AsyncIterable<KaylaAIChunk> {
      const text = 'CodeForge and Kayla AI Publisher are both FDS products with different purposes.';
      for (const word of text.split(' ')) yield { type: 'content', content: word + ' ' };
      yield { type: 'done' };
    }
  };
  return { ...actual, createAIProvider: () => scripted };
});

const { handleKaylaChat } = await import('../src/lib/kayla/handler');
const { createKaylaConfig } = await import('../src/lib/kayla/config');

function liveShapedEndpoint(onDiagnostics: (d: KaylaDiagnostics) => void) {
  // provider/model shaped exactly like production so the routing gate sees
  // the same providerConfig it would live — only the network call is scripted.
  return {
    providerConfig: { provider: 'openrouter', model: 'openrouter/free' },
    kaylaConfig: { ...createKaylaConfig({}), enabled: true, provider: 'openrouter', apiKey: 'test' },
    consumeRequestAllowance: async () => true,
    consumeAIAllowance: async () => true,
    onDiagnostics
  };
}

async function routingOutcome(question: string) {
  const diagnostics: KaylaDiagnostics[] = [];
  const { response } = await handleKaylaChat(
    { message: question, history: [], context: { route: '/', pageType: 'home' } },
    liveShapedEndpoint((d) => diagnostics.push(d))
  );
  return { body: response as KaylaChatResponse, providerAttempted: diagnostics[0]?.providerAttempted ?? false };
}

describe('Adaptive routing matrix: settled facts never attempt the provider', () => {
  const deterministic = [
    'Who founded FDS?',
    'What does CodeForge cost?',
    'Can I download KyraBlox?',
    'Which projects are downloadable?'
  ];

  for (const question of deterministic) {
    it(`"${question}" resolves without the provider`, async () => {
      const { providerAttempted } = await routingOutcome(question);
      expect(providerAttempted, question).toBe(false);
    });
  }

  it('"What does ACTIVE DEVELOPMENT mean?" resolves without the provider (status taxonomy, settled)', async () => {
    const { providerAttempted, body } = await routingOutcome('What does ACTIVE DEVELOPMENT mean?');
    expect(providerAttempted).toBe(false);
    expect(body.routeMode).toBe('deterministic');
  });
});

describe('Adaptive routing matrix: synthesis questions reach the provider', () => {
  const synthesis = [
    'Compare CodeForge and Kayla AI Publisher.',
    'How are GEMS and Training Grounds related?',
    'How do the FDS apps fit together?',
    'CodeForge vs ForgerEMS'
  ];

  for (const question of synthesis) {
    it(`"${question}" attempts the provider`, async () => {
      const { providerAttempted, body } = await routingOutcome(question);
      expect(providerAttempted, question).toBe(true);
      expect(body.mode).toBe('ai');
    });
  }
});

describe('Retrieval-quality regression: adverbial phrasing still resolves deterministically', () => {
  // "What can I actually download?" fell through to keyword retrieval before
  // the availability-intent pattern tolerated a word between the pronoun and
  // the verb, and surfaced an unrelated project as the top result.
  const phrasings = [
    'What can I actually download?',
    'How can I actually get CodeForge?',
    'Can I really use KyraBlox today?'
  ];

  for (const question of phrasings) {
    it(`"${question}" resolves from canonical availability data, not keyword retrieval`, async () => {
      const { providerAttempted, body } = await routingOutcome(question);
      expect(providerAttempted, question).toBe(false);
      expect(body.routeMode, question).toBe('deterministic');
    });
  }
});
