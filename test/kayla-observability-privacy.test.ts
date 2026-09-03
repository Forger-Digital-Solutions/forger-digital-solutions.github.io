import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { handleKaylaChat } from '../src/lib/kayla/handler';
import { createKaylaConfig } from '../src/lib/kayla/config';
import { classifyProviderError, parseProviderError, emptyDiagnostics, type KaylaDiagnostics } from '../src/lib/kayla/diagnostics';

/**
 * Observability has to be rich enough to diagnose a production incident and
 * poor enough that it is not surveillance. Kayla is a public website
 * assistant: the operator needs to know *which lane answered and why*, never
 * what a visitor typed.
 */

const SECRET_MARKER = 'zzq-unique-visitor-phrase-9137';

const offline = {
  providerConfig: { provider: '' },
  kaylaConfig: { ...createKaylaConfig({}), enabled: false, provider: '' },
  consumeRequestAllowance: async () => true,
  consumeAIAllowance: async () => false
};

describe('Diagnostics never carry visitor content', () => {
  it('omits the question text entirely', async () => {
    const captured: KaylaDiagnostics[] = [];
    await handleKaylaChat(
      { message: `What is CodeForge? ${SECRET_MARKER}`, history: [], context: { route: '/', pageType: 'home' } },
      { ...offline, onDiagnostics: (d) => captured.push(d) }
    );
    expect(captured).toHaveLength(1);
    expect(JSON.stringify(captured[0])).not.toContain(SECRET_MARKER);
  });

  it('omits conversation history', async () => {
    const captured: KaylaDiagnostics[] = [];
    await handleKaylaChat(
      {
        message: 'Can I download it?',
        history: [
          { role: 'user', content: `Tell me about CodeForge ${SECRET_MARKER}` },
          { role: 'assistant', content: `Something ${SECRET_MARKER}` }
        ],
        context: { route: '/', pageType: 'home' }
      },
      { ...offline, onDiagnostics: (d) => captured.push(d) }
    );
    expect(JSON.stringify(captured[0])).not.toContain(SECRET_MARKER);
  });

  it('omits the answer text', async () => {
    const captured: KaylaDiagnostics[] = [];
    const { response } = await handleKaylaChat(
      { message: 'Who founded FDS?', history: [], context: { route: '/', pageType: 'home' } },
      { ...offline, onDiagnostics: (d) => captured.push(d) }
    );
    const answer = (response as { answer: string }).answer;
    const serialized = JSON.stringify(captured[0]);
    expect(answer.length).toBeGreaterThan(20);
    expect(serialized).not.toContain(answer);
  });

  it('carries only enum-ish fields, counts, and identifiers', async () => {
    const captured: KaylaDiagnostics[] = [];
    await handleKaylaChat(
      { message: 'Compare CodeForge and Kayla AI Publisher.', history: [], context: { route: '/', pageType: 'home' } },
      { ...offline, onDiagnostics: (d) => captured.push(d) }
    );
    const allowed = new Set([
      'routeMode', 'intent', 'entity', 'providerAttempted', 'providerOutcome', 'providerFailure',
      'upstreamStatus', 'verificationOutcome', 'verificationKinds', 'fallbackReason', 'sourceCount', 'actionCount'
    ]);
    for (const key of Object.keys(captured[0])) {
      expect(allowed.has(key), `unexpected diagnostics field: ${key}`).toBe(true);
    }
  });

  it('a diagnostics sink that throws cannot break the response', async () => {
    const { status, response } = await handleKaylaChat(
      { message: 'Who founded FDS?', history: [], context: { route: '/', pageType: 'home' } },
      { ...offline, onDiagnostics: () => { throw new Error('sink exploded'); } }
    );
    expect(status).toBe(200);
    expect((response as { answer: string }).answer).toContain('Edward Schmidt');
  });
});

describe('Worker logging surface', () => {
  const workerSource = readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8');
  const guardSource = readFileSync(new URL('../worker/abuse-guard.ts', import.meta.url), 'utf8');

  it('never logs the raw client address', () => {
    // The address is hashed with a server-side salt to form the limiter
    // identity; the raw value must not reach a log line.
    expect(workerSource).not.toMatch(/console\.[a-z]+\([^)]*CF-Connecting-IP/i);
    expect(workerSource).not.toMatch(/console\.[a-z]+\([^)]*rawIp/);
  });

  it('never logs the request body or the answer', () => {
    expect(workerSource).not.toMatch(/console\.[a-z]+\([^)]*bodyText/);
    expect(workerSource).not.toMatch(/console\.[a-z]+\([^)]*\bmessage\b/);
  });

  it('persists only counters in the durable object', () => {
    // Anything stored here outlives the request, so it must stay limited to
    // rate/budget bookkeeping.
    const stored = [...guardSource.matchAll(/storage\.put\(\{\s*([^}]*)\}/g)].map((match) => match[1]);
    expect(stored.length).toBeGreaterThan(0);
    for (const entry of stored) {
      expect(entry).toMatch(/rate|ai-budget/);
    }
  });

  it('hashes the limiter identity rather than storing an address', () => {
    expect(guardSource).toContain('crypto.subtle.digest');
    expect(guardSource).toMatch(/SHA-256/);
  });
});

describe('Provider failure classification', () => {
  it('maps upstream statuses to distinct, stable classes', () => {
    expect(classifyProviderError('RATE_LIMITED')).toBe('rate_limited');
    expect(classifyProviderError('AUTH_FAILURE')).toBe('unauthorized');
    expect(classifyProviderError('TIMEOUT')).toBe('timeout');
    expect(classifyProviderError('QUOTA_EXHAUSTED')).toBe('payment_required');
    expect(classifyProviderError('MODEL_UNAVAILABLE')).toBe('model_unavailable');
    expect(classifyProviderError('EMPTY_RESPONSE')).toBe('empty_response');
  });

  it('treats an unknown code as an upstream failure rather than inventing a class', () => {
    expect(classifyProviderError('SOMETHING_NEW')).toBe('upstream_failure');
    expect(classifyProviderError(undefined)).toBe('upstream_failure');
  });

  it('recovers the upstream status carried on the error', () => {
    expect(parseProviderError('PROVIDER_FAILURE:503')).toEqual({ code: 'PROVIDER_FAILURE', status: 503 });
    expect(parseProviderError('TIMEOUT')).toEqual({ code: 'TIMEOUT', status: undefined });
  });

  it('starts from a not-attempted baseline', () => {
    const empty = emptyDiagnostics();
    expect(empty.providerAttempted).toBe(false);
    expect(empty.providerOutcome).toBe('not_attempted');
  });
});
