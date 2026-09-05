import { handleKaylaChat, streamKaylaChat, type KaylaEndpointConfig } from '../src/lib/kayla/handler';
import { createKaylaConfig, getAllowedOrigins, getRateLimitSalt, type KaylaEnv } from '../src/lib/kayla/config';
import { isOriginAllowed, buildCorsHeaders, type CorsOptions } from '../src/lib/kayla/cors';
import { evaluateModelPolicy, ZERO_COST_POLICY } from '../src/lib/kayla/model-policy';
import { KaylaAbuseGuard, createLimiterIdentifier } from './abuse-guard';
import type { KaylaDiagnostics } from '../src/lib/kayla/diagnostics';
import { getCanonicalKnowledgeVersion } from '../src/data/kayla/canonical-registry';

interface DurableStub { fetch(request: Request | string, init?: RequestInit): Promise<Response>; }
interface DurableNamespace { idFromName(name: string): unknown; get(id: unknown): DurableStub; }
interface WorkerEnv extends KaylaEnv { ABUSE_GUARD: DurableNamespace; KAYLA_RATE_LIMIT_SALT?: string; KAYLA_DEBUG?: string; }
interface ExecutionContextLike { waitUntil(promise: Promise<unknown>): void; }
interface RequestLog { requestId: string; route: string; status: number; responseMode: string; retrievalCount?: number; providerResult?: string; durationMs: number; rateLimit: string; }

const SECURITY_HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };

export { KaylaAbuseGuard };

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContextLike): Promise<Response> {
    const started = Date.now();
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const allowedOrigins = getAllowedOrigins(env);
    const corsOptions: CorsOptions = { allowedOrigins, allowedMethods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type'], maxAge: 3600 };
    const finalize = (response: Response, responseMode: string, rateLimit = 'not_checked'): Response => {
      const headers = new Headers(response.headers);
      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => headers.set(key, value));
      headers.set('X-Request-ID', requestId);
      Object.entries(buildCorsHeaders(origin, corsOptions)).forEach(([key, value]) => headers.set(key, value));
      const output = new Response(response.body, { status: response.status, statusText: response.statusText, headers });
      ctx.waitUntil(logSafe({ requestId, route: url.pathname, status: response.status, responseMode, durationMs: Date.now() - started, rateLimit }, env));
      return output;
    };
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

    if (request.method === 'OPTIONS') {
      if (!origin || !isOriginAllowed(origin, allowedOrigins)) return finalize(json({ error: 'Origin not allowed' }, 403), 'cors_blocked');
      return finalize(new Response(null, { status: 204 }), 'preflight');
    }
    if (origin && !isOriginAllowed(origin, allowedOrigins)) return finalize(json({ error: 'Origin not allowed', errorType: 'CORS_ERROR' }, 403), 'cors_blocked');

    const config = createKaylaConfig(env);
    const policy = evaluateModelPolicy(config.provider, config.model);
    const limiterReady = Boolean(env.ABUSE_GUARD && getRateLimitSalt(env).length >= 16);

    if (url.pathname === '/api/kayla/health') {
      if (request.method !== 'GET') return finalize(json({ error: 'Method not allowed' }, 405), 'rejected');
      // Whether the shared daily allowance still has room is the difference
      // between "the model lane is available" and "the model lane is dark for
      // everyone until UTC midnight". aiAvailable claimed the former while the
      // latter was true, which is what made the Phase 6 gap so hard to read.
      const budget = await readAIBudget(env, config.aiDailyRequestLimit);
      return finalize(json({
        status: limiterReady ? 'ok' : 'degraded', knowledgeReady: true,
        knowledgeVersion: getCanonicalKnowledgeVersion(),
        aiEnabled: config.enabled, aiConfigured: config.enabled && Boolean(config.apiKey) && policy.eligible,
        aiAvailable: config.enabled && Boolean(config.apiKey) && policy.eligible && budget.remaining > 0,
        aiConfiguredButExhausted: config.enabled && Boolean(config.apiKey) && policy.eligible && budget.remaining <= 0,
        aiDailyLimit: budget.limit, aiDailyUsed: budget.used, aiDailyRemaining: budget.remaining,
        provider: config.provider || 'local', modelPolicy: ZERO_COST_POLICY.toLowerCase().replaceAll('_', '-'),
        streaming: true, rateLimiter: limiterReady ? 'ready' : 'unavailable', mode: 'production'
      }), 'health');
    }
    if (url.pathname !== '/api/kayla/chat') return finalize(json({ error: 'Not Found', errorType: 'NOT_FOUND' }, 404), 'not_found');
    if (request.method !== 'POST') return finalize(json({ error: 'Method not allowed', errorType: 'METHOD_NOT_ALLOWED' }, 405), 'rejected');
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return finalize(json({ error: 'Content-Type must be application/json', errorType: 'VALIDATION_ERROR' }, 415), 'rejected');

    const contentLength = Number(request.headers.get('Content-Length') || '0');
    if (contentLength > config.maxPayloadBytes) return finalize(json({ error: 'Payload too large', errorType: 'VALIDATION_ERROR' }, 413), 'rejected');
    let bodyText: string;
    try { bodyText = await request.text(); } catch { return finalize(json({ error: 'Unable to read request', errorType: 'VALIDATION_ERROR' }, 400), 'rejected'); }
    if (new TextEncoder().encode(bodyText).byteLength > config.maxPayloadBytes) return finalize(json({ error: 'Payload too large', errorType: 'VALIDATION_ERROR' }, 413), 'rejected');
    let body: unknown;
    try { body = JSON.parse(bodyText); } catch { return finalize(json({ error: 'Invalid JSON', errorType: 'VALIDATION_ERROR' }, 400), 'rejected'); }

    // Cloudflare supplies CF-Connecting-IP in production. Miniflare does not,
    // so permit one deterministic loopback identity only on an actual loopback
    // hostname; every non-loopback deployment still fails closed without it.
    const rawIp = request.headers.get('CF-Connecting-IP') || (isLoopbackHost(url.hostname) ? 'local-loopback' : '');
    const limiterId = await createLimiterIdentifier(getRateLimitSalt(env), rawIp);
    if (!limiterId || !env.ABUSE_GUARD) return finalize(json({ error: 'Kayla is temporarily unavailable. Please try again later.', errorType: 'SERVICE_UNAVAILABLE' }, 503), 'guard_unavailable', 'unavailable');
    const rateStub = env.ABUSE_GUARD.get(env.ABUSE_GUARD.idFromName(`client:${limiterId}`));
    const globalStub = env.ABUSE_GUARD.get(env.ABUSE_GUARD.idFromName('global-ai-budget'));
    const consumeAIAllowance = async () => safeAllowance(globalStub, '/ai-budget', { limit: config.aiDailyRequestLimit }, false);

    // Consume the per-client allowance once, at the edge, so the streaming and
    // JSON paths agree. Previously the stream consumed it inside the generator
    // and reported exhaustion as HTTP 200 with an error body, which the browser
    // rendered as an AI outage instead of a rate limit.
    const requestAllowed = await safeAllowance(rateStub, '/rate', { minuteLimit: config.rateLimitPerMinute, hourLimit: config.rateLimitPerHour }, false);
    if (!requestAllowed) {
      return finalize(json({ error: 'Kayla has answered several questions from this connection recently. Please try again in a minute.', errorType: 'RATE_LIMITED' }, 429), 'rate_limited', 'blocked');
    }

    // Operator-facing only. Correlates to the visitor's X-Request-ID header so
    // a reported problem can be traced without logging what they typed.
    const emitDiagnostics = (diagnostics: KaylaDiagnostics): void => {
      try {
        console.log(JSON.stringify({
          event: 'kayla_request_diagnostics',
          requestId,
          knowledgeVersion: getCanonicalKnowledgeVersion(),
          durationMs: Date.now() - started,
          ...diagnostics
        }));
      } catch { /* logging must never break a response */ }
    };

    const endpointConfig: KaylaEndpointConfig = {
      providerConfig: { provider: config.provider, model: config.model, apiKey: config.apiKey, timeoutMs: config.requestTimeoutMs },
      kaylaConfig: config, consumeRequestAllowance: async () => true, consumeAIAllowance,
      onDiagnostics: emitDiagnostics
    };
    const stream = url.searchParams.get('stream') === 'true';
    if (stream) {
      const readable = new ReadableStream({ async start(controller) {
        try { for await (const chunk of streamKaylaChat(body, endpointConfig)) controller.enqueue(new TextEncoder().encode(`${chunk}\n`)); }
        catch { controller.enqueue(new TextEncoder().encode(`${JSON.stringify({ content: 'Kayla is temporarily unavailable. Please try again later.', mode: 'local', done: true })}\n`)); }
        finally { controller.close(); }
      }});
      return finalize(new Response(readable, { status: 200, headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'X-Accel-Buffering': 'no' } }), policy.eligible ? 'stream' : 'local', 'checked');
    }
    const { status, response } = await handleKaylaChat(body, endpointConfig);
    return finalize(json(response, status), 'mode' in response ? response.mode : 'rejected', 'checked');
  }
};

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

/**
 * Read the shared daily AI allowance without consuming it. Fails soft: a
 * guard that cannot be read must not take the health endpoint down with it.
 */
async function readAIBudget(env: WorkerEnv, limit: number): Promise<{ limit: number; used: number; remaining: number }> {
  if (!env.ABUSE_GUARD) return { limit, used: 0, remaining: limit };
  try {
    const stub = env.ABUSE_GUARD.get(env.ABUSE_GUARD.idFromName('global-ai-budget'));
    const response = await stub.fetch('https://guard.invalid/ai-budget-status');
    if (!response.ok) return { limit, used: 0, remaining: limit };
    const state = await response.json() as { day?: string | null; count?: number };
    const today = new Date().toISOString().slice(0, 10);
    const used = state.day === today ? Number(state.count) || 0 : 0;
    return { limit, used, remaining: Math.max(0, limit - used) };
  } catch {
    return { limit, used: 0, remaining: limit };
  }
}

async function safeAllowance(stub: DurableStub, path: string, body: Record<string, unknown>, fallback: boolean): Promise<boolean> {
  try { const response = await stub.fetch(`https://guard.invalid${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return response.ok && Boolean((await response.json() as { allowed?: boolean }).allowed); }
  catch { return fallback; }
}
async function logSafe(entry: RequestLog, env: WorkerEnv): Promise<void> {
  console.log(JSON.stringify(entry));
  if (env.KAYLA_DEBUG === 'true') console.debug(JSON.stringify({ requestId: entry.requestId, event: 'request_complete' }));
}
