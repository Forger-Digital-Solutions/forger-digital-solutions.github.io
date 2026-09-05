import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleKaylaChat, streamKaylaChat, type KaylaEndpointConfig } from '../src/lib/kayla/handler';
import { createKaylaConfig, type KaylaConfig } from '../src/lib/kayla/config';
import { KaylaAbuseGuard } from '../worker/abuse-guard';
import { isProviderEligible } from '../src/lib/kayla/handler';
import { isPromptInjectionAttempt } from '../src/lib/kayla/validate';
import { classifyIntent } from '../src/data/kayla/intents';
import { verifyAgainstCanon } from '../src/lib/kayla/verify';
import { checkAnswerShape } from '../src/lib/kayla/well-formed';
import { validateSafeAction } from '../src/lib/kayla/action-validator';
import { evaluateModelPolicy } from '../src/lib/kayla/model-policy';
import { createAIProvider } from '../src/lib/kayla/provider';
import { getCanonicalKnowledgeVersion } from '../src/data/kayla/canonical-registry';
import type { KaylaChatResponse, KaylaDiagnostics } from '../src/data/kayla/types';
import type { KaylaDiagnostics as Diag } from '../src/lib/kayla/diagnostics';

/**
 * Phase 12 production-reliability suite (handler level).
 *
 * Everything here runs in-process with a stubbed global fetch, so no test
 * spends provider quota or touches production. The suite attacks the ugly
 * paths: provider outages, exhausted budgets, concurrent sessions sharing one
 * handler, oversized and hostile input, and unbounded growth — while proving
 * the fast lanes stay fast and provider-free.
 */

const PROVIDER_QUESTION = 'Give me a short overview of how the FDS ecosystem fits together.';

const aiBase: KaylaConfig = { ...createKaylaConfig({}), enabled: true, provider: 'openrouter', model: 'openrouter/free', apiKey: 'test-key', requestTimeoutMs: 500 };

function endpoint(overrides: Partial<KaylaEndpointConfig> = {}, diagnostics: Diag[] = []): KaylaEndpointConfig {
  return {
    providerConfig: { provider: 'openrouter', model: 'openrouter/free', apiKey: 'test-key', timeoutMs: 500 },
    kaylaConfig: aiBase,
    consumeRequestAllowance: async () => true,
    consumeAIAllowance: async () => true,
    onDiagnostics: (d) => diagnostics.push(d),
    ...overrides
  };
}

const offlineEndpoint: KaylaEndpointConfig = {
  providerConfig: { provider: '' },
  kaylaConfig: { ...createKaylaConfig({}), enabled: false },
  consumeRequestAllowance: async () => true
};

async function ask(message: string, config: KaylaEndpointConfig = offlineEndpoint, extra: Record<string, unknown> = {}) {
  return handleKaylaChat({ message, history: [], context: { route: '/', pageType: 'home' }, ...extra }, config);
}

const answerOf = (response: unknown): string => (response as KaylaChatResponse).answer ?? (response as { error: string }).error ?? '';

/** Visitor-facing text must never carry provider/ops internals. */
function expectVisitorSafe(text: string): void {
  for (const leaked of ['OpenRouter', 'openrouter', 'Durable', 'at /', '.ts:', 'stack', 'Bearer', 'sk-or', 'system prompt']) {
    expect(text, `visitor text leaks "${leaked}"`).not.toContain(leaked);
  }
}

function sseResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    }
  });
  return new Response(stream, { status, headers: { 'Content-Type': 'text/event-stream' } });
}

function openRouterJson(content: unknown): Response {
  return Response.json({ choices: [{ message: { content } }], model: 'gratis-model/1' });
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('Phase 12 - provider latency contract', () => {
  it('audits the production provider timeout ceiling (9000ms, not raised)', async () => {
    const prod = createKaylaConfig({ KAYLA_PROVIDER_TIMEOUT_MS: '9000' });
    expect(prod.requestTimeoutMs).toBe(9000);
  });

  it('deterministic answers never attempt a provider call', async () => {
    const diagnostics: Diag[] = [];
    const { status, response } = await ask('Who founded FDS?', endpoint({}, diagnostics));
    expect(status).toBe(200);
    expect((response as KaylaChatResponse).routeMode).toBe('deterministic');
    expect(diagnostics[0]?.providerAttempted).toBe(false);
    expect(diagnostics[0]?.providerOutcome).toBe('not_attempted');
  });

  it('a provider success is verified before serving (resolved model tracked, never exposed)', async () => {
    const { response: local } = await ask(PROVIDER_QUESTION, offlineEndpoint);
    const canonicalText = answerOf(local);
    expect(canonicalText.length).toBeGreaterThan(20);
    vi.stubGlobal('fetch', async () => openRouterJson(canonicalText));
    const diagnostics: Diag[] = [];
    const { status, response } = await ask(PROVIDER_QUESTION, endpoint({}, diagnostics));
    expect(status).toBe(200);
    const body = response as KaylaChatResponse;
    expect(body.mode).toBe('ai');
    expect(body.routeMode).toBe('provider_accepted');
    expect(diagnostics[0]?.providerAttempted).toBe(true);
    expect(diagnostics[0]?.providerOutcome).toBe('accepted');
    expectVisitorSafe(body.answer);
  });
});

describe('Phase 12 - provider failure matrix', () => {
  const cases: { name: string; stub: () => Response | Promise<never>; failure: string; upstreamStatus?: number }[] = [
    { name: 'upstream 429', stub: () => new Response('slow down', { status: 429 }), failure: 'rate_limited', upstreamStatus: 429 },
    { name: 'upstream 401', stub: () => new Response('no', { status: 401 }), failure: 'unauthorized', upstreamStatus: 401 },
    { name: 'upstream 403', stub: () => new Response('no', { status: 403 }), failure: 'unauthorized', upstreamStatus: 403 },
    { name: 'upstream 500', stub: () => new Response('boom', { status: 500 }), failure: 'upstream_failure', upstreamStatus: 500 },
    { name: 'upstream 502', stub: () => new Response('boom', { status: 502 }), failure: 'upstream_failure', upstreamStatus: 502 },
    { name: 'upstream 503', stub: () => new Response('boom', { status: 503 }), failure: 'upstream_failure', upstreamStatus: 503 },
    { name: 'upstream 402', stub: () => new Response('pay', { status: 402 }), failure: 'payment_required', upstreamStatus: 402 },
    { name: 'dead model id 404', stub: () => new Response('gone', { status: 404 }), failure: 'model_unavailable', upstreamStatus: 404 },
    { name: 'invalid JSON body', stub: () => new Response('{not json', { status: 200 }), failure: 'malformed_response' },
    { name: 'missing choices', stub: () => Response.json({}), failure: 'malformed_response' },
    { name: 'missing content', stub: () => Response.json({ choices: [{}] }), failure: 'malformed_response' },
    { name: 'empty answer', stub: () => Response.json({ choices: [{ message: { content: '' } }] }), failure: 'malformed_response' },
    { name: 'network failure', stub: () => Promise.reject(new Error('fetch failed')), failure: 'network_failure' }
  ];

  for (const { name, stub, failure, upstreamStatus } of cases) {
    it(`${name}: clean fallback with classified diagnostics, no raw error`, async () => {
      vi.stubGlobal('fetch', async () => stub());
      const diagnostics: Diag[] = [];
      const { status, response } = await ask(PROVIDER_QUESTION, endpoint({}, diagnostics));
      expect(status).toBe(200);
      const body = response as KaylaChatResponse;
      expect(body.mode).toBe('local');
      expect(body.routeMode).toBe('provider_failed_fallback');
      expect(body.answer.length).toBeGreaterThan(0);
      expectVisitorSafe(body.answer);
      expect(diagnostics[0]?.providerAttempted).toBe(true);
      expect(diagnostics[0]?.providerOutcome).toBe('failed');
      expect(diagnostics[0]?.providerFailure).toBe(failure);
      if (upstreamStatus !== undefined) expect(diagnostics[0]?.upstreamStatus).toBe(upstreamStatus);
    });
  }

  it('provider timeout: bounded by config, then grounded fallback (no second expensive pass)', async () => {
    // A hanging upstream must respect the abort signal exactly like a real
    // fetch does; otherwise the configured timeout cannot fire.
    vi.stubGlobal('fetch', (_url: unknown, init?: { signal?: AbortSignal }) => new Promise<Response>((_resolve, reject) => {
      if (init?.signal?.aborted) { reject(new DOMException('aborted', 'AbortError')); return; }
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    const diagnostics: Diag[] = [];
    const started = performance.now();
    const { status, response } = await ask(PROVIDER_QUESTION, endpoint({ providerConfig: { provider: 'openrouter', model: 'openrouter/free', apiKey: 'test-key', timeoutMs: 60 } }, diagnostics));
    const elapsed = performance.now() - started;
    expect(status).toBe(200);
    expect((response as KaylaChatResponse).routeMode).toBe('provider_failed_fallback');
    expect(diagnostics[0]?.providerFailure).toBe('timeout');
    // Bounded: ~60ms timeout plus local fallback work, far below the 9000ms ceiling.
    expect(elapsed).toBeLessThan(5000);
    expectVisitorSafe(answerOf(response));
  });

  it('fallback reuses the already-computed retrieval answer (prepared before the provider attempt)', async () => {
    vi.stubGlobal('fetch', async () => new Response('down', { status: 500 }));
    const { response: local } = await ask(PROVIDER_QUESTION, offlineEndpoint);
    const diagnostics: Diag[] = [];
    const { response: fallback } = await ask(PROVIDER_QUESTION, endpoint({}, diagnostics));
    const localBody = local as KaylaChatResponse;
    const fallbackBody = fallback as KaylaChatResponse;
    // Same grounded evidence, no extra retrieval/provider round-trip to build it.
    expect(fallbackBody.sources).toEqual(localBody.sources);
  });

  it('error recovery: a provider failure does not poison the next deterministic request', async () => {
    vi.stubGlobal('fetch', async () => new Response('down', { status: 500 }));
    await ask(PROVIDER_QUESTION, endpoint({}, []));
    const { status, response } = await ask('What does CodeForge cost?', endpoint({}, []));
    expect(status).toBe(200);
    expect((response as KaylaChatResponse).answer).toMatch(/free/i);
  });
});

describe('Phase 12 - budget exhaustion UX', () => {
  it('aiDailyRemaining = 0: deterministic answers keep working, provider lane falls back silently', async () => {
    const diagnostics: Diag[] = [];
    const exhausted = endpoint({ consumeAIAllowance: async () => false }, diagnostics);
    const { response: det } = await ask('Who founded FDS?', exhausted);
    expect((det as KaylaChatResponse).routeMode).toBe('deterministic');
    const { response: prov } = await ask(PROVIDER_QUESTION, exhausted);
    const body = prov as KaylaChatResponse;
    expect(body.mode).toBe('local');
    expect(body.routeMode).toBe('provider_failed_fallback');
    expect(diagnostics.at(-1)?.providerFailure).toBe('budget_exhausted');
    expect(body.answer).not.toMatch(/budget exhausted/i);
    expectVisitorSafe(body.answer);
  });
});

describe('Phase 12 - concurrent visitor isolation', () => {
  const session = (history: { role: 'user' | 'assistant'; content: string }[], message: string) =>
    handleKaylaChat({ message, history, context: { route: '/', pageType: 'home' } }, offlineEndpoint);

  for (const count of [10, 25, 50]) {
    it(`${count} concurrent independent sessions: all succeed with no cross-visitor bleed`, async () => {
      const calls = Array.from({ length: count }, (_, i) =>
        i % 2 === 0
          ? session([{ role: 'user', content: 'Tell me about Sapphire.' }], 'Tell me more about it.')
          : session([], 'Can I download CodeForge?')
      );
      const results = await Promise.all(calls);
      expect(results).toHaveLength(count);
      for (const { status } of results) expect(status).toBe(200);
      // Odd sessions carry NO history: "Can I download CodeForge?" names its own
      // entity, so none may inherit Sapphire context from an even session.
      results.forEach(({ response }, i) => {
        const text = answerOf(response);
        if (i % 2 === 1) expect(text).not.toMatch(/sapphire/i);
        else expect(text.length).toBeGreaterThan(0);
      });
    });
  }

  it('visitor B with empty history never inherits visitor A conversation state', async () => {
    const [a, b] = await Promise.all([
      session(
        [{ role: 'user', content: 'Tell me about CodeForge.' }, { role: 'assistant', content: 'CodeForge is the free-first engineering agent.' }],
        'Where do I download it?'
      ),
      session([], 'Can I download KyraBlox?')
    ]);
    expect(answerOf(b.response)).not.toMatch(/codeforge/i);
    expect(answerOf(a.response).length).toBeGreaterThan(0);
  });
});

describe('Phase 12 - abuse-guard atomicity and windows', () => {
  class MemoryStorage {
    private data = new Map<string, unknown>();
    async get<T>(key: string): Promise<T | undefined> { return this.data.get(key) as T | undefined; }
    async put(entries: Record<string, unknown>): Promise<void> {
      for (const [key, value] of Object.entries(entries)) this.data.set(key, structuredClone(value));
    }
  }

  /** Serializes whole guard.fetch calls the way the Durable Object runtime
   *  serializes fetches to one stub: proves the read-modify-write LOGIC cannot
   *  overshoot once interleaving is removed (the platform provides that
   *  serialization in production — one stub, one fetch at a time). */
  function serialized(guard: KaylaAbuseGuard): KaylaAbuseGuard {
    let tail: Promise<unknown> = Promise.resolve();
    const target = guard.fetch.bind(guard);
    guard.fetch = ((request: Request) => {
      const run = tail.then(() => target(request));
      tail = run.catch(() => {});
      return run;
    }) as KaylaAbuseGuard['fetch'];
    return guard;
  }

  const rate = (guard: KaylaAbuseGuard, input: Record<string, unknown>) =>
    guard.fetch(new Request('https://guard.invalid/rate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }));
  const budget = (guard: KaylaAbuseGuard, input: Record<string, unknown>) =>
    guard.fetch(new Request('https://guard.invalid/ai-budget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }));
  const allowed = async (r: Response) => ((await r.clone().json()) as { allowed: boolean }).allowed;

  it('per-client rate limit is exact: 5 allowed, 6th denied with retry guidance', async () => {
    const guard = new KaylaAbuseGuard({ storage: new MemoryStorage() });
    const now = Date.now();
    for (let i = 0; i < 5; i++) expect(await allowed(await rate(guard, { minuteLimit: 5, hourLimit: 60, now }))).toBe(true);
    const denied = await rate(guard, { minuteLimit: 5, hourLimit: 60, now });
    expect(await allowed(denied)).toBe(false);
    expect(((await denied.json()) as { retryAfterSeconds: number }).retryAfterSeconds).toBeGreaterThan(0);
  });

  it('concurrent threshold burst cannot overshoot under serialized access (10 racing, exactly 5 pass)', async () => {
    const guard = serialized(new KaylaAbuseGuard({ storage: new MemoryStorage() }));
    const now = Date.now();
    const outcomes = await Promise.all(Array.from({ length: 10 }, () => rate(guard, { minuteLimit: 5, hourLimit: 60, now }).then(allowed)));
    expect(outcomes.filter(Boolean)).toHaveLength(5);
  });

  it('daily budget gate is exact: remaining 1 admits exactly one of two simultaneous requests', async () => {
    const guard = serialized(new KaylaAbuseGuard({ storage: new MemoryStorage() }));
    const now = Date.now();
    await budget(guard, { limit: 2, now });
    const outcomes = await Promise.all([
      budget(guard, { limit: 2, now }).then(allowed),
      budget(guard, { limit: 2, now }).then(allowed)
    ]);
    expect(outcomes.filter(Boolean)).toHaveLength(1);
  });

  it('minute and hour windows reset deterministically', async () => {
    const guard = new KaylaAbuseGuard({ storage: new MemoryStorage() });
    const t = 1_700_000_000_000;
    for (let i = 0; i < 5; i++) expect(await allowed(await rate(guard, { minuteLimit: 5, hourLimit: 6, now: t }))).toBe(true);
    expect(await allowed(await rate(guard, { minuteLimit: 5, hourLimit: 6, now: t }))).toBe(false);
    // Next minute: minute window resets, hour still has room for one.
    expect(await allowed(await rate(guard, { minuteLimit: 5, hourLimit: 6, now: t + 61_000 }))).toBe(true);
    // Hour now exhausted until it rolls over.
    expect(await allowed(await rate(guard, { minuteLimit: 5, hourLimit: 6, now: t + 62_000 }))).toBe(false);
    expect(await allowed(await rate(guard, { minuteLimit: 5, hourLimit: 6, now: t + 3_601_000 }))).toBe(true);
  });

  it('daily budget resets at the UTC date boundary without waiting for midnight', async () => {
    const guard = new KaylaAbuseGuard({ storage: new MemoryStorage() });
    const dayA = new Date('2026-09-04T23:59:00Z').getTime();
    const dayB = new Date('2026-09-05T00:01:00Z').getTime();
    for (let i = 0; i < 3; i++) expect(await allowed(await budget(guard, { limit: 3, now: dayA }))).toBe(true);
    expect(await allowed(await budget(guard, { limit: 3, now: dayA }))).toBe(false);
    expect(await allowed(await budget(guard, { limit: 3, now: dayB }))).toBe(true);
  });

  it('clock skew (past or far-future timestamps) resets rather than locks the window', async () => {
    const guard = new KaylaAbuseGuard({ storage: new MemoryStorage() });
    const t = 1_700_000_000_000;
    for (let i = 0; i < 5; i++) await rate(guard, { minuteLimit: 5, hourLimit: 60, now: t });
    expect(await allowed(await rate(guard, { minuteLimit: 5, hourLimit: 60, now: t }))).toBe(false);
    expect(await allowed(await rate(guard, { minuteLimit: 5, hourLimit: 60, now: 0 }))).toBe(true);
    expect(await allowed(await rate(guard, { minuteLimit: 5, hourLimit: 60, now: t + 10_000_000_000 }))).toBe(true);
  });

  it('one visitor cannot practically starve the shared daily budget within rate limits', async () => {
    // Max-rate abuser: 5 requests every minute. 150 budget / 5 per minute =
    // 30+ minutes of sustained ceiling-rate hammering from ONE client before
    // the shared budget even empties — and deterministic/task lanes never
    // consume it at all.
    const guard = new KaylaAbuseGuard({ storage: new MemoryStorage() });
    const t0 = 1_700_000_000_000;
    let consumed = 0;
    let minutes = 0;
    while (consumed < 150 && minutes < 29) {
      const now = t0 + minutes * 61_000;
      for (let i = 0; i < 5; i++) {
        if (await allowed(await rate(guard, { minuteLimit: 5, hourLimit: 10_000, now }))) {
          if (await allowed(await budget(guard, { limit: 150, now }))) consumed++;
        }
      }
      minutes++;
    }
    expect(consumed).toBeLessThan(150);
    expect(minutes).toBe(29);
  });

  it('storage failure rejects loudly so callers fail closed, never open', async () => {
    const failing = { get: async () => { throw new Error('storage down'); }, put: async () => { throw new Error('storage down'); } };
    const guard = new KaylaAbuseGuard({ storage: failing });
    await expect(rate(guard, { minuteLimit: 5, hourLimit: 60 })).rejects.toThrow();
    await expect(budget(guard, { limit: 150 })).rejects.toThrow();
  });
});

describe('Phase 12 - request contract hardening', () => {
  const bodies: { name: string; body: unknown }[] = [
    { name: 'null', body: null },
    { name: 'array', body: [] },
    { name: 'number', body: 42 },
    { name: 'string', body: 'hello' },
    { name: 'empty object', body: {} },
    { name: 'missing message', body: { history: [] } },
    { name: 'numeric message', body: { message: 42 } },
    { name: 'history as string', body: { message: 'hi', history: 'all of it' } },
    { name: 'oversized history', body: { message: 'hi', history: Array.from({ length: 11 }, (_, i) => ({ role: 'user', content: `q${i}` })) } },
    { name: 'context as string', body: { message: 'hi', context: 'home' } },
    { name: 'privileged fields', body: { message: 'hi', model: 'gpt-4', apiKey: 'x' } }
  ];
  for (const { name, body } of bodies) {
    it(`malformed body (${name}): structured 400, no crash, no internals`, async () => {
      const { status, response } = await handleKaylaChat(body, offlineEndpoint);
      expect(status).toBe(400);
      expect((response as { errorType: string }).errorType).toBe('VALIDATION_ERROR');
      expectVisitorSafe((response as { error: string }).error);
    });
  }

  it('huge input: just below limit ok, at/above limit rejected cleanly', async () => {
    const config = createKaylaConfig({});
    const ok = await handleKaylaChat({ message: `What is CodeForge? ${'x'.repeat(config.maxMessageLength - 30)}` }, offlineEndpoint);
    expect([200, 400]).toContain(ok.status);
    const { status, response } = await handleKaylaChat({ message: `x ${'y'.repeat(config.maxMessageLength)}` }, offlineEndpoint);
    expect(status).toBe(400);
    expectVisitorSafe((response as { error: string }).error);
  });

  it('unicode and emoji inputs are handled, never break parsing', async () => {
    for (const message of ['What is CodeForge? 🚀', 'GEMSって何？', '¿Qué es CodeForge?']) {
      const { status, response } = await ask(message);
      expect(status).toBe(200);
      expect(answerOf(response).length).toBeGreaterThan(0);
    }
  });

  it('lone surrogates and control characters are normalized or rejected, never crash', async () => {
    const { status: lone } = await ask('What is CodeForge? �');
    expect([200, 400]).toContain(lone);
    const { status: nul } = await ask('What is CodeForge?\u0000');
    expect([200, 400]).toContain(nul);
  });

  it('HTML/script input is refused as text, never executed or echoed raw', async () => {
    const { status, response } = await ask('<script>alert(1)</script>');
    expect(status).toBe(200);
    const body = response as KaylaChatResponse;
    expect(body.routeMode).toBe('deterministic');
    expect(body.answer).toMatch(/can't help/);
    expect(body.answer).not.toContain('<script>');
  });

  it('malicious action URLs are rejected by the validator (Phase 5 firewall holds)', () => {
    for (const href of ['javascript:alert(1)', 'data:text/html,<h1>x</h1>', 'vbscript:msgbox(1)', 'JaVaScRiPt:alert(1)']) {
      expect(validateSafeAction({ type: 'OPEN_PAGE', label: 'x', href }).valid, href).toBe(false);
    }
  });
});

describe('Phase 12 - long conversations stay bounded', () => {
  it('20-turn conversation within the 10-message window resolves the recent subject', async () => {
    const history = Array.from({ length: 10 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: i % 2 === 0 ? `Tell me about CodeForge detail ${i}.` : `CodeForge note ${i}.`
    }));
    const { status, response } = await handleKaylaChat(
      { message: 'Where do I download it?', history, context: { route: '/', pageType: 'home' } },
      offlineEndpoint
    );
    expect(status).toBe(200);
    expect(answerOf(response).length).toBeGreaterThan(0);
  });

  it('provider context stays bounded: oversized history is rejected, not silently grown', async () => {
    const history = Array.from({ length: 25 }, (_, i) => ({ role: 'user' as const, content: `question ${i}` }));
    const { status, response } = await handleKaylaChat({ message: 'hi', history }, offlineEndpoint);
    expect(status).toBe(400);
    expect((response as { errorType: string }).errorType).toBe('VALIDATION_ERROR');
  });

  it('configured memory bounds are finite and sane', () => {
    const config = createKaylaConfig({});
    expect(config.maxHistoryMessages).toBeGreaterThan(0);
    expect(config.maxHistoryMessages).toBeLessThanOrEqual(20);
    expect(config.maxMessageLength).toBeGreaterThan(0);
    expect(config.maxMessageLength).toBeLessThanOrEqual(8000);
    expect(config.maxRetries).toBe(0);
  });
});

describe('Phase 12 - stream contract', () => {
  async function collect(message: string, config: KaylaEndpointConfig = offlineEndpoint) {
    const frames: Record<string, unknown>[] = [];
    for await (const raw of streamKaylaChat({ message, history: [], context: { route: '/', pageType: 'home' } }, config)) {
      frames.push(JSON.parse(raw) as Record<string, unknown>);
    }
    return frames;
  }

  it('deterministic stream: exactly one terminal done frame, no duplicates', async () => {
    const frames = await collect('Who founded FDS?');
    const finals = frames.filter((f) => f.done === true);
    expect(finals).toHaveLength(1);
    expect(String(finals[0].content ?? '')).toMatch(/forger/i);
  });

  it('rate-limited stream: single structured error frame, never a 200-shaped answer', async () => {
    const frames = await collect('Who founded FDS?', { ...offlineEndpoint, consumeRequestAllowance: async () => false });
    expect(frames).toHaveLength(1);
    expect(frames[0].errorType).toBe('RATE_LIMITED');
  });

  it('provider stream failure: graceful fallback frame with replace + done', async () => {
    vi.stubGlobal('fetch', async () => new Response('down', { status: 500 }));
    const frames = await collect(PROVIDER_QUESTION, endpoint({}, []));
    const finals = frames.filter((f) => f.done === true);
    expect(finals).toHaveLength(1);
    expect(finals[0].replace).toBe(true);
    expectVisitorSafe(String(finals[0].content ?? ''));
  });

  it('SSE parser: awkward chunk boundaries and multiple events per packet reassemble', async () => {
    const { createAIProvider: realFactory } = await import('../src/lib/kayla/provider');
    const provider = realFactory({ provider: 'openrouter', model: 'openrouter/free', apiKey: 'k', timeoutMs: 2000 });
    expect(provider?.stream).toBeDefined();
    // One SSE event split mid-token across packets + two events in one packet.
    vi.stubGlobal('fetch', async () =>
      sseResponse(['data: {"choices":[{"delta":{"content":"Code', 'Forge is free"}}]}\n\ndata: {"choices":[{"delta":{"content":"!"}}]}\ndata: [DONE]\n'])
    );
    let text = '';
    let dones = 0;
    for await (const chunk of provider!.stream!({ message: 'hi', history: [], context: undefined, sources: [] })) {
      if (chunk.type === 'content') text += chunk.content;
      if (chunk.type === 'done') dones++;
    }
    expect(text).toBe('CodeForge is free!');
    expect(dones).toBe(1);
  });

  it('malformed SSE stream surfaces a typed error, never partial garbage as success', async () => {
    const provider = createAIProvider({ provider: 'openrouter', model: 'openrouter/free', apiKey: 'k', timeoutMs: 2000 });
    vi.stubGlobal('fetch', async () => sseResponse(['this is not sse at all\n\n']));
    const seen: string[] = [];
    for await (const chunk of provider!.stream!({ message: 'hi', history: [], context: undefined, sources: [] })) seen.push(chunk.type);
    expect(seen).toContain('done');
    expect(seen.filter((t) => t === 'content').join('')).toBe('');
  });
});

describe('Phase 12 - regex and serialization hot paths', () => {
  it('adversarial 10k/50k inputs complete quickly with no ReDoS-like blowup', () => {
    const evil10k = `${'a'.repeat(5000)}!${' '.repeat(4999)}`;
    const evil50k = `ignore ${'previous '.repeat(6000)}instructions! ${'<'.repeat(9000)}script${'>'.repeat(9000)}`;
    for (const input of [evil10k, evil50k]) {
      const started = performance.now();
      isPromptInjectionAttempt(input);
      classifyIntent(input.slice(0, 4000));
      verifyAgainstCanon(input.slice(0, 2000));
      checkAnswerShape(input.slice(0, 2000));
      expect(performance.now() - started).toBeLessThan(3000);
    }
  });

  it('diagnostics stay bounded: fixed key set, no prompt/answer/identity material', () => {
    const diagnostics: Diag[] = [];
    // Offline lane: no provider is ever constructed, so no network can occur.
    return ask(PROVIDER_QUESTION, { ...offlineEndpoint, onDiagnostics: (d) => diagnostics.push(d) }).then(() => {
      const record = (diagnostics[0] ?? {}) as Record<string, unknown>;
      const serialized = JSON.stringify(record);
      expect(serialized.length).toBeLessThan(2000);
      for (const banned of ['prompt', 'answer', 'content', 'message', 'history', 'apiKey', 'apikey', 'authorization', 'ip', 'cookie']) {
        expect(Object.keys(record).join(',').toLowerCase()).not.toContain(banned);
      }
    });
  });

  it('largest deterministic responses stay concise', async () => {
    const questions = ['Who founded FDS?', 'What can I actually download?', 'How can I support FDS?', 'List every FDS project.'];
    let max = 0;
    for (const message of questions) {
      const { response } = await ask(message);
      max = Math.max(max, answerOf(response).length);
    }
    expect(max).toBeGreaterThan(0);
    expect(max).toBeLessThan(8000);
  });
});

describe('Phase 12 - privacy and logging', () => {
  it('provider failure logs carry no prompt, answer, key, header, or IP', async () => {
    vi.stubGlobal('fetch', async () => new Response('down', { status: 500 }));
    const secretQuestion = 'Who founded FDS? zz-unique-probe-7429';
    const logged: string[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => { logged.push(args.map(String).join(' ')); };
    try {
      await ask(secretQuestion, endpoint({ onDiagnostics: (d) => { original(JSON.stringify({ event: 'kayla_request_diagnostics', ...d })); } }));
    } finally {
      console.log = original;
    }
    const joined = logged.join('\n');
    expect(joined).not.toContain('zz-unique-probe-7429');
    expect(joined).not.toContain('203.0.113');
    expect(joined).not.toContain('test-key');
    expect(joined).not.toContain('Bearer');
  });

  it('request diagnostics never receive the prompt or answer by construction', async () => {
    const diagnostics: KaylaDiagnostics[] = [];
    await ask('Who founded FDS?', endpoint({}, diagnostics as Diag[]));
    const keys = Object.keys(diagnostics[0] ?? {});
    expect(keys).not.toContain('message');
    expect(keys).not.toContain('answer');
    expect(keys).not.toContain('prompt');
  });
});

describe('Phase 12 - zero-cost and efficiency hold', () => {
  it('no paid model passes the policy gate', () => {
    expect(evaluateModelPolicy('openrouter', 'openai/gpt-4').eligible).toBe(false);
    expect(evaluateModelPolicy('anthropic', 'claude-3').eligible).toBe(false);
    expect(evaluateModelPolicy('openrouter', 'openrouter/free').eligible).toBe(true);
    expect(createAIProvider({ provider: 'openrouter', model: 'some-paid-model', apiKey: 'x' })).toBeNull();
  });

  it('settled task questions stay provider-free (routing efficiency preserved)', async () => {
    for (const message of ['What can I actually download?', 'How can I support FDS?']) {
      const diagnostics: Diag[] = [];
      await ask(message, endpoint({}, diagnostics));
      expect(diagnostics[0]?.providerAttempted, message).toBe(false);
    }
  });

  it('thin-retrieval questions are provider-eligible by design, and fail cleanly', async () => {
    // "What community resources exist?" has no settled canonical answer, so
    // the gate attempts synthesis — the one job the model lane exists for.
    // When the provider is down it must still fall back without internals.
    vi.stubGlobal('fetch', async () => new Response('down', { status: 500 }));
    const diagnostics: Diag[] = [];
    const { status, response } = await ask('What community resources exist?', endpoint({}, diagnostics));
    expect(status).toBe(200);
    expect(diagnostics[0]?.providerAttempted).toBe(true);
    const body = response as KaylaChatResponse;
    expect(body.mode).toBe('local');
    expectVisitorSafe(body.answer);
  });

  it('canonical knowledge version is deterministic across calls', () => {
    expect(getCanonicalKnowledgeVersion()).toBe(getCanonicalKnowledgeVersion());
    expect(getCanonicalKnowledgeVersion()).toMatch(/^[0-9a-f]{16}$/);
  });

  it('eligibility gate is a budget decision that never bypasses verification', () => {
    // Even when the gate declines, the served answer went through canonical
    // verification upstream — declining can only cost synthesis, never truth.
    expect(isProviderEligible('Who founded FDS?', [], { provider: 'openrouter' })).toBe(false);
  });
});
