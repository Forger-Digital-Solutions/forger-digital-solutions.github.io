import { describe, it, expect, vi } from 'vitest';
import type { KaylaAIProvider, KaylaAIChunk, KaylaChatResponse } from '../src/data/kayla/types';
import type { KaylaDiagnostics } from '../src/lib/kayla/diagnostics';
import { classifyLane } from '../src/lib/kayla/lanes';
import { evaluateModelPolicy, evaluateRoutePolicy } from '../src/lib/kayla/model-policy';
import { checkAnswerShape } from '../src/lib/kayla/well-formed';
import { createKaylaConfig } from '../src/lib/kayla/config';
import { handleKaylaChat } from '../src/lib/kayla/handler';

/**
 * Kayla Copilot 2.0 general-AI certification.
 *
 * The golden suite and routing contract certify the FDS-only degraded path.
 * This file certifies what changed: general questions reach a provider, free
 * routes are the only routes, machine scaffolding never reaches a visitor,
 * and no provider/model/lane vocabulary leaks into the public response.
 */

/* ------------------------------------------------------------------ */
/* Scripted provider (no network, no quota)                            */
/* ------------------------------------------------------------------ */

let scriptedAnswer = 'Here is a general answer about the topic you asked about, explained step by step.';
let scriptedReject: string | undefined;

vi.mock('../src/lib/kayla/provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/kayla/provider')>();
  const scripted: KaylaAIProvider = {
    id: 'scripted',
    name: 'Scripted Test Provider',
    async isAvailable() { return true; },
    async chat() {
      if (scriptedReject === 'throw') throw new Error('upstream exploded');
      if (scriptedReject) return { content: scriptedReject };
      return { content: scriptedAnswer, resolvedModel: 'scripted-model-1' };
    },
    async *stream(): AsyncIterable<KaylaAIChunk> {
      for (const word of scriptedAnswer.split(' ')) yield { type: 'content', content: word + ' ' };
      yield { type: 'done' };
    }
  };
  return { ...actual, createAIProvider: () => scripted };
});

const liveEndpoint = (onDiagnostics?: (d: KaylaDiagnostics) => void) => ({
  providerConfig: { provider: 'groq', model: 'qwen/test-free-model' },
  kaylaConfig: { ...createKaylaConfig({}), enabled: true, provider: 'groq', model: 'qwen/test-free-model', apiKey: 'test' },
  consumeRequestAllowance: async () => true,
  consumeAIAllowance: async () => true,
  onDiagnostics
});

const offlineEndpoint = {
  providerConfig: { provider: '' },
  kaylaConfig: { ...createKaylaConfig({}), enabled: false, provider: '' },
  consumeRequestAllowance: async () => true,
  consumeAIAllowance: async () => false
};

async function ask(message: string, endpoint = liveEndpoint()) {
  const { response } = await handleKaylaChat(
    { message, history: [], context: { route: '/', pageType: 'home' } },
    endpoint
  );
  return response as KaylaChatResponse;
}

/* ------------------------------------------------------------------ */
/* Lane classification                                                  */
/* ------------------------------------------------------------------ */

describe('Lane classification', () => {
  it('routes ordinary assistant requests to the general lane', () => {
    const generalQuestions = [
      'Explain how recursion works in programming.',
      'Write a haiku about rain.',
      'Why is my Python for-loop skipping elements?',
      'Brainstorm names for a coffee shop.',
      'What is the difference between TCP and UDP?',
      'Help me plan a weekly study schedule.',
      'Summarize the plot of Romeo and Juliet.',
      'What is 17% of 340?'
    ];
    for (const message of generalQuestions) {
      expect(classifyLane({ message, sources: [] }), message).toBe('general');
    }
  });

  it('routes bare task requests to the general lane', () => {
    // The old unsupported_task boundary refused these outright; Kayla 2.0
    // answers them through inference.
    for (const message of ['Write me a Python app.', 'Can you edit my manuscript?', 'Diagnose my computer.']) {
      expect(classifyLane({ message, intent: 'unsupported_task', sources: [] }), message).toBe('general');
    }
  });

  it('routes always-settled intents to the deterministic lane', () => {
    for (const [message, intent] of [
      ['Who founded FDS?', 'founder'],
      ['How much does CodeForge cost?', 'pricing'],
      ["What's the weather today?", 'external_current'],
      ['What API key does Kayla use?', 'private_info']
    ] as const) {
      expect(classifyLane({ message, intent: intent as never, sources: [] }), message).toBe('deterministic');
    }
  });

  it('routes entity-dependent intents by FDS signal, not by intent alone', () => {
    // "Can I download CodeForge?" still settles deterministically — through
    // the canonical answer, which the handler checks before the lane. The
    // classifier itself only calls an entity-less version/status/identity
    // question general: "what version of Python do I have?" is not about FDS.
    expect(classifyLane({ message: 'What version of Python do I have?', intent: 'version' as never, sources: [] })).toBe('general');
    expect(classifyLane({ message: 'Explain how a hash map works.', intent: 'identity' as never, sources: [] })).toBe('general');
  });

  it('routes a task naming an FDS entity to the mixed lane', () => {
    expect(
      classifyLane({ message: 'Write a launch tweet about CodeForge.', intent: 'unsupported_task', sources: [] })
    ).toBe('mixed');
    expect(
      classifyLane({ message: 'How does CodeForge differ from a normal coding assistant?', sources: [] })
    ).toBe('mixed');
  });

  it('keeps pure FDS questions in the fds lane', () => {
    const { matchEntity } = { matchEntity: () => 'codeforge' };
    expect(matchEntity()).toBe('codeforge');
    const sources = [{ snippet: 'CodeForge is a free-first engineering platform.', score: 80 }] as never;
    expect(classifyLane({ message: 'Tell me everything about CodeForge.', sources })).toBe('fds');
  });
});

/* ------------------------------------------------------------------ */
/* General capability end-to-end                                       */
/* ------------------------------------------------------------------ */

describe('General lane answers through the provider', () => {
  it('answers a general knowledge question with provider output', async () => {
    const diag: KaylaDiagnostics[] = [];
    const response = await ask('Explain how a hash map works.', liveEndpoint((d) => diag.push(d)));
    expect(response.mode).toBe('ai');
    expect(response.routeMode).toBe('provider_accepted');
    expect(response.answer).toContain('general answer');
    expect(diag[0]?.lane).toBe('general');
    expect(diag[0]?.providerOutcome).toBe('accepted');
  });

  it('accepts a coding answer that includes a code block', async () => {
    scriptedAnswer = 'Use enumerate to track the index:\n\n```python\nfor i, item in enumerate(items):\n    print(i, item)\n```';
    const response = await ask('How do I get the index in a Python for loop?');
    expect(response.mode).toBe('ai');
    expect(response.answer).toContain('enumerate');
    expect(response.answer).toContain('```');
    scriptedAnswer = 'General answer.';
  });

  it('answers writing and brainstorming requests', async () => {
    scriptedAnswer = 'Here are five name ideas: Ember & Oak, Daily Grindhouse, Steam Theory, Copper Cup, Nightroast.';
    const response = await ask('Brainstorm names for a coffee shop.');
    expect(response.mode).toBe('ai');
    expect(response.answer).toContain('Ember & Oak');
    scriptedAnswer = 'General answer.';
  });

  it('reports unavailable rather than fabricating when the provider fails on a general question', async () => {
    scriptedReject = 'throw';
    const diag: KaylaDiagnostics[] = [];
    const response = await ask('Explain quantum entanglement.', liveEndpoint((d) => diag.push(d)));
    expect(response.mode).toBe('unavailable');
    expect(response.answer).toMatch(/temporarily unavailable|try again/i);
    expect(diag[0]?.routeMode).toBe('provider_failed_fallback');
    scriptedReject = undefined;
  });

  it('serves canonical facts deterministically even while the provider is live', async () => {
    const response = await ask('Who founded FDS?');
    expect(response.answer).toContain('Edward Schmidt');
    expect(response.routeMode).toBe('deterministic');
  });

  it('rejects a provider answer that contradicts canonical FDS facts', async () => {
    scriptedAnswer = 'CodeForge costs $49 per month and is developed by OpenAI.';
    const response = await ask('How much does CodeForge cost?');
    expect(response.answer).not.toContain('$49');
    expect(response.answer).not.toContain('OpenAI');
    expect(response.answer.toLowerCase()).toContain('free');
    scriptedAnswer = 'General answer.';
  });
});

/* ------------------------------------------------------------------ */
/* Scaffolding and leak rejection                                      */
/* ------------------------------------------------------------------ */

describe('Machine scaffolding never reaches the visitor', () => {
  it('rejects control tokens, reasoning leaks, and classifier output', () => {
    const poisoned = [
      '<|im_start|>assistant\nHere is the answer.<|im_end|>',
      'Let me think step by step.\n\nThought: the user wants X\n\nFinal answer: hello',
      'Safety: safe\nThe capital of France is Paris.',
      '{"answer": "paris", "tool_calls": []}',
      '<think>reasoning here</think> Paris.',
      'the the the the the the the the the the the the the the the the'
    ];
    for (const text of poisoned) {
      expect(checkAnswerShape(text, { allowCodeFences: true }).ok, JSON.stringify(text.slice(0, 40))).toBe(false);
    }
  });

  it('accepts clean prose and fenced code', () => {
    expect(checkAnswerShape('Paris is the capital of France.', { allowCodeFences: true }).ok).toBe(true);
    expect(checkAnswerShape('Try this:\n\n```js\nconsole.log(1);\n```', { allowCodeFences: true }).ok).toBe(true);
  });

  it('falls back when the provider emits scaffolding', async () => {
    scriptedReject = '<|im_start|>assistant\nI know everything.<|im_end|>';
    const response = await ask('Explain how rain forms.');
    expect(response.answer).not.toContain('im_start');
    expect(response.mode).not.toBe('ai');
    scriptedReject = undefined;
  });
});

/* ------------------------------------------------------------------ */
/* Free-only policy                                                    */
/* ------------------------------------------------------------------ */

describe('Zero-cost model policy', () => {
  it('admits the verified free routes and rejects paid ones', () => {
    expect(evaluateModelPolicy('openrouter', 'openrouter/free').eligible).toBe(true);
    expect(evaluateModelPolicy('openrouter', 'qwen/qwen3.8-27b:free').eligible).toBe(true);
    expect(evaluateModelPolicy('groq', 'qwen/qwen3.8-27b').eligible).toBe(true);
    expect(evaluateModelPolicy('openrouter', 'openai/gpt-4o').eligible).toBe(false);
    expect(evaluateModelPolicy('groq', 'openai/gpt-oss-paid').eligible).toBe(false);
    expect(evaluateModelPolicy('anthropic', 'claude-sonnet-4').eligible).toBe(false);
  });

  it('rejects a paid route even when it is explicitly configured', () => {
    expect(evaluateRoutePolicy({ provider: 'openrouter', model: 'openai/gpt-4o', apiKey: 'k' }).eligible).toBe(false);
    expect(evaluateRoutePolicy({ provider: 'openrouter', model: 'qwen/qwen3.8-27b:free', apiKey: 'k' }).eligible).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Public surface never leaks internals                                */
/* ------------------------------------------------------------------ */

describe('No internal vocabulary in the public response', () => {
  // Provider/model/route NAMES are operator internals. The routeMode enum
  // itself is established wire contract — it proves which lane fired without
  // naming any provider, model, or route.
  const INTERNALS = /groq|openrouter|gemini|qwen|resolvedModel|providerRoute|attemptedRoutes|kayla-api|api[_ ]key|scripted-model/i;
  const INTERNAL_FIELDS = ['resolvedModel', 'providerRoute', 'attemptedRoutes', 'lane', 'providerOutcome', 'providerFailure', 'upstreamStatus'];

  it('a general answer carries no routing internals', async () => {
    const response = await ask('Explain how rain forms.');
    const wire = JSON.stringify(response);
    expect(wire).not.toMatch(INTERNALS);
    for (const field of INTERNAL_FIELDS) {
      expect((response as Record<string, unknown>)[field], field).toBeUndefined();
    }
  });

  it('a provider failure carries no routing internals', async () => {
    scriptedReject = 'throw';
    const response = await ask('Explain how rain forms.');
    expect(JSON.stringify(response)).not.toMatch(INTERNALS);
    for (const field of INTERNAL_FIELDS) {
      expect((response as Record<string, unknown>)[field], field).toBeUndefined();
    }
    scriptedReject = undefined;
  });

  it('the unavailable state is generic', async () => {
    const response = await ask('Explain how rain forms.', offlineEndpoint);
    expect(response.mode).toBe('unavailable');
    expect(response.answer).toMatch(/temporarily unavailable|try again/i);
    expect(JSON.stringify(response)).not.toMatch(INTERNALS);
  });
});
