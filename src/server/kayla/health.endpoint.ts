import type { APIRoute } from 'astro';
import { createKaylaConfig } from '../../lib/kayla/config';
import { corsResponse, corsPreflightResponse } from '../../lib/kayla/cors';

export const prerender = false;

const CORS_OPTIONS = {
  allowedOrigins: ['http://localhost:4321', 'http://127.0.0.1:4321'],
  allowedMethods: ['GET', 'OPTIONS'] as string[],
  allowedHeaders: ['Content-Type'] as string[],
  maxAge: 86400
};

export const GET: APIRoute = async ({ request }) => {
  const origin = request.headers.get('Origin');

  if (request.method === 'OPTIONS') {
    return corsPreflightResponse(origin, CORS_OPTIONS);
  }

  const config = createKaylaConfig();
  const aiConfigured = config.provider !== '' && config.apiKey !== '';

  return corsResponse({
    status: 'ok',
    aiConfigured,
    knowledgeReady: true,
    mode: config.enabled && aiConfigured ? 'ai-capable' : 'knowledge'
  }, origin, CORS_OPTIONS);
};
