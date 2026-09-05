import { describe, it, expect, beforeEach } from 'vitest';
import worker, { KaylaAbuseGuard } from '../worker/index';
import { getCanonicalKnowledgeVersion } from '../src/data/kayla/canonical-registry';

/**
 * Phase 12 Worker HTTP hardening (in-process, in-memory Durable Objects).
 *
 * Pins the production edge contract under messy conditions: hostile origins,
 * malformed bodies, missing identity, dead guards, and unknown routes — plus
 * the observability fields (request IDs, knowledge version) the Phase 12
 * canary depends on. No network, no quota, no production traffic.
 */

class MemoryStorage {
  private data = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | undefined> { return this.data.get(key) as T | undefined; }
  async put(entries: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(entries)) this.data.set(key, structuredClone(value));
  }
}

function makeEnv(overrides: Record<string, string> = {}, opts: { guard?: boolean } = {}) {
  const guards = new Map<string, KaylaAbuseGuard>();
  const env: Record<string, unknown> = {
    KAYLA_ENABLED: 'false',
    KAYLA_PROVIDER: '',
    KAYLA_MODEL: 'openrouter/free',
    KAYLA_ALLOWED_ORIGINS: 'https://forger-digital-solutions.github.io',
    KAYLA_RATE_LIMIT_SALT: 'a-test-salt-at-least-16-chars',
    KAYLA_RATE_LIMIT_PER_MINUTE: '5',
    KAYLA_RATE_LIMIT_PER_HOUR: '60',
    ...overrides
  };
  if (opts.guard !== false) {
    env.ABUSE_GUARD = {
      idFromName: (name: string) => name,
      get: (id: unknown) => {
        const key = String(id);
        if (!guards.has(key)) guards.set(key, new KaylaAbuseGuard({ storage: new MemoryStorage() }));
        return { fetch: (url: string | Request, init?: RequestInit) => guards.get(key)!.fetch(new Request(typeof url === 'string' ? url : url.url, init)) };
      }
    };
  }
  return env as never;
}

const ctx = { waitUntil: () => {} };
const ORIGIN = 'https://forger-digital-solutions.github.io';
let ipCounter = 100;

function chatRequest(body: unknown, { stream = false, origin = ORIGIN, ip = `198.51.100.${ipCounter++}` }: { stream?: boolean; origin?: string | null; ip?: string } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip };
  if (origin) headers.Origin = origin;
  return new Request(`https://kayla-api.test/api/kayla/chat${stream ? '?stream=true' : ''}`, {
    method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body)
  });
}

describe('Phase 12 Worker - CORS matrix', () => {
  it('allows the production origin and requests without an Origin (non-browser clients)', async () => {
    const env = makeEnv();
    const allowed = await worker.fetch(chatRequest({ message: 'hi' }), env, ctx);
    expect(allowed.status).not.toBe(403);
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    const noOrigin = await worker.fetch(chatRequest({ message: 'hi' }, { origin: null }), env, ctx);
    expect(noOrigin.status).not.toBe(403);
  });

  const hostile = [
    'https://evil.example',
    'https://forger-digital-solutions.github.io.evil.example',
    'https://evil-forger-digital-solutions.github.io',
    'https://forger-digital-solutions.github.io.evil.com',
    'https://api.forger-digital-solutions.github.io',
    'https://forger-digital-solutions.github.io.',
    'http://forger-digital-solutions.github.io',
    'https://forger-digital-solutions.github.io:443.evil.example'
  ];
  for (const origin of hostile) {
    it(`rejects lookalike/hostile origin: ${origin}`, async () => {
      const response = await worker.fetch(chatRequest({ message: 'hi' }, { origin }), makeEnv(), ctx);
      expect(response.status).toBe(403);
      // A blocked origin gets no reflected ACAO header to abuse.
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
  }

  it('answers a valid preflight with 204 and the exact allowed origin', async () => {
    const response = await worker.fetch(
      new Request('https://kayla-api.test/api/kayla/chat', { method: 'OPTIONS', headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST' } }),
      makeEnv(), ctx
    );
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
  });

  it('rejects a hostile preflight without CORS headers', async () => {
    const response = await worker.fetch(
      new Request('https://kayla-api.test/api/kayla/chat', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }),
      makeEnv(), ctx
    );
    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

describe('Phase 12 Worker - method, content-type, and body shapes', () => {
  it('rejects non-POST chat methods and wrong content types cleanly', async () => {
    const env = makeEnv();
    for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
      const r = await worker.fetch(new Request('https://kayla-api.test/api/kayla/chat', { method, headers: { Origin: ORIGIN } }), env, ctx);
      expect(r.status, method).toBe(405);
    }
    const wrongType = await worker.fetch(
      new Request('https://kayla-api.test/api/kayla/chat', { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'text/plain' }, body: 'hi' }),
      env, ctx
    );
    expect(wrongType.status).toBe(415);
  });

  const deepBody: Record<string, unknown> = { message: 'hi' };
  { let cursor = deepBody; for (let i = 0; i < 10; i++) { const next: Record<string, unknown> = {}; cursor.a = next; cursor = next; } }
  const bodies: { name: string; body: unknown; status: number }[] = [
    { name: 'null', body: null, status: 400 },
    { name: 'array', body: [], status: 400 },
    { name: 'number', body: 42, status: 400 },
    { name: 'empty object', body: {}, status: 400 },
    { name: 'missing message', body: { history: [] }, status: 400 },
    { name: 'history wrong type', body: { message: 'hi', history: 'everything' }, status: 400 },
    { name: 'context wrong type', body: { message: 'hi', context: 42 }, status: 400 },
    { name: 'deeply nested', body: deepBody, status: 400 }
  ];
  for (const { name, body, status } of bodies) {
    it(`malformed body (${name}) -> ${status} with no crash and no internals`, async () => {
      const response = await worker.fetch(chatRequest(body), makeEnv(), ctx);
      expect(response.status).toBe(status);
      const text = await response.text();
      expect(text).not.toMatch(/at .+\.ts:\d+|Durable|Traceback/);
    });
  }

  it('unknown routes are 404, health rejects POST', async () => {
    const env = makeEnv();
    const missing = await worker.fetch(new Request('https://kayla-api.test/nope', { headers: { Origin: ORIGIN } }), env, ctx);
    expect(missing.status).toBe(404);
    const healthPost = await worker.fetch(new Request('https://kayla-api.test/api/kayla/health', { method: 'POST', headers: { Origin: ORIGIN } }), env, ctx);
    expect(healthPost.status).toBe(405);
  });
});

describe('Phase 12 Worker - identity, request IDs, and fail-closed guards', () => {
  it('fails closed without a client IP on non-loopback hosts (no anonymous bypass)', async () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Origin: ORIGIN };
    const response = await worker.fetch(
      new Request('https://kayla-api.test/api/kayla/chat', { method: 'POST', headers, body: JSON.stringify({ message: 'hi' }) }),
      makeEnv(), ctx
    );
    expect(response.status).toBe(503);
  });

  it('fails closed with a missing guard or short salt, in visitor-safe words', async () => {
    const headers = (ip: string): Record<string, string> => ({ 'Content-Type': 'application/json', Origin: ORIGIN, 'CF-Connecting-IP': ip });
    const noGuard = await worker.fetch(
      new Request('https://kayla-api.test/api/kayla/chat', { method: 'POST', headers: headers('203.0.113.50'), body: JSON.stringify({ message: 'hi' }) }),
      makeEnv({}, { guard: false }), ctx
    );
    expect(noGuard.status).toBe(503);
    expect(await noGuard.text()).not.toMatch(/Durable|ABUSE_GUARD|salt/i);
    const shortSalt = await worker.fetch(
      new Request('https://kayla-api.test/api/kayla/chat', { method: 'POST', headers: headers('203.0.113.51'), body: JSON.stringify({ message: 'hi' }) }),
      makeEnv({ KAYLA_RATE_LIMIT_SALT: 'short' }), ctx
    );
    expect(shortSalt.status).toBe(503);
  });

  it('emits a unique non-secret X-Request-ID per response', async () => {
    const env = makeEnv();
    const ids = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const response = await worker.fetch(chatRequest({ message: 'Who founded FDS?' }), env, ctx);
      const id = response.headers.get('X-Request-ID');
      expect(id, 'missing request id').toBeTruthy();
      expect(id!).toMatch(/^[0-9a-f-]{8,}/i);
      ids.add(id!);
    }
    expect(ids.size).toBe(5);
  });

  it('rate-limit denials are 429 with visitor-safe copy (no Durable Object jargon)', async () => {
    const env = makeEnv({ KAYLA_RATE_LIMIT_PER_MINUTE: '1' });
    await worker.fetch(chatRequest({ message: 'hi' }, { ip: '203.0.113.60' }), env, ctx);
    const limited = await worker.fetch(chatRequest({ message: 'hi' }, { ip: '203.0.113.60' }), env, ctx);
    expect(limited.status).toBe(429);
    const body = (await limited.json()) as { error: string; errorType: string };
    expect(body.errorType).toBe('RATE_LIMITED');
    expect(body.error).toMatch(/try again/i);
    expect(body.error).not.toMatch(/durable|guard|quota|allowance/i);
  });

  it('health exposes the exact local knowledge version and degrades without a salt', async () => {
    const ok = await worker.fetch(new Request('https://kayla-api.test/api/kayla/health'), makeEnv(), ctx);
    const body = (await ok.json()) as { knowledgeVersion: string; rateLimiter: string };
    expect(body.knowledgeVersion).toBe(getCanonicalKnowledgeVersion());
    const degraded = await worker.fetch(new Request('https://kayla-api.test/api/kayla/health'), makeEnv({ KAYLA_RATE_LIMIT_SALT: '' }), ctx);
    expect(((await degraded.json()) as { rateLimiter: string }).rateLimiter).toBe('unavailable');
  });

  it('chat responses are no-store with a JSON content type', async () => {
    const response = await worker.fetch(chatRequest({ message: 'Who founded FDS?' }), makeEnv(), ctx);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Content-Type')).toContain('application/json');
  });
});
