import type { APIRoute } from 'astro';
import { handleKaylaChat, streamKaylaChat } from '../../lib/kayla/handler';
import { createKaylaConfig } from '../../lib/kayla/config';
import { getClientId } from '../../lib/kayla/requestUtils';
import { buildCorsHeaders, isOriginAllowed, corsPreflightResponse, corsResponse, type CorsOptions } from '../../lib/kayla/cors';

export const prerender = false;

const CORS_OPTIONS: CorsOptions = {
  // This endpoint exists only for Astro's local development server. Production
  // traffic is handled by the Worker, whose origin allow-list is configured in
  // wrangler.toml. Keep these explicit instead of weakening CORS with `*`.
  allowedOrigins: ['http://localhost:4321', 'http://127.0.0.1:4321'],
  allowedMethods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
};

export const GET: APIRoute = async ({ request }) => {
  const origin = request.headers.get('Origin');

  if (request.method === 'OPTIONS') {
    return corsPreflightResponse(origin, CORS_OPTIONS);
  }

  const url = new URL(request.url);
  const path = url.pathname;

  if (path.endsWith('/health')) {
    const config = createKaylaConfig();
    const aiConfigured = config.provider !== '' && config.apiKey !== '';

    return corsResponse({
      status: 'ok',
      aiConfigured,
      knowledgeReady: true,
      mode: config.enabled && aiConfigured ? 'ai-capable' : 'knowledge'
    }, origin, CORS_OPTIONS);
  }

  return corsResponse({ error: 'Not Found', errorType: 'NOT_FOUND' }, origin, CORS_OPTIONS, 404);
};

export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('Origin');

  if (request.method === 'OPTIONS') {
    return corsPreflightResponse(origin, CORS_OPTIONS);
  }

  if (!isOriginAllowed(origin, CORS_OPTIONS.allowedOrigins)) {
    return corsResponse({ error: 'Origin not allowed', errorType: 'CORS_ERROR' }, origin, CORS_OPTIONS, 403);
  }

  const kaylaConfig = createKaylaConfig();
  const clientId = getClientId(request);

  const providerConfig = {
    provider: kaylaConfig.provider,
    model: kaylaConfig.model,
    apiKey: kaylaConfig.apiKey,
    endpoint: kaylaConfig.endpoint,
    timeoutMs: kaylaConfig.requestTimeoutMs
  };

  const url = new URL(request.url);
  const stream = url.searchParams.get('stream') === 'true';

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return corsResponse({ error: 'Invalid JSON', errorType: 'VALIDATION_ERROR' }, origin, CORS_OPTIONS, 400);
  }

  if (stream) {
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamKaylaChat(body, { providerConfig, kaylaConfig, getClientIp: () => clientId })) {
            controller.enqueue(new TextEncoder().encode(chunk + '\n'));
          }
          controller.close();
        } catch {
          controller.enqueue(new TextEncoder().encode(JSON.stringify({ error: 'Stream error', done: true }) + '\n'));
          controller.close();
        }
      }
    });

    const corsHeaders = buildCorsHeaders(origin, CORS_OPTIONS);
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
        ...corsHeaders
      }
    });
  }

  const { status, response } = await handleKaylaChat(body, { providerConfig, kaylaConfig, getClientIp: () => clientId });

  const corsHeaders = buildCorsHeaders(origin, CORS_OPTIONS);
  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': String(kaylaConfig.rateLimitPerMinute),
      ...corsHeaders
    }
  });
};
