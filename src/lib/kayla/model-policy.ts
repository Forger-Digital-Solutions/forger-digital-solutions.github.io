import type { KaylaRouteSpec } from '../../data/kayla/types';

export const ZERO_COST_POLICY = 'ZERO_COST_ONLY' as const;
export const OPENROUTER_FREE_MODEL = 'openrouter/free';
export const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
export const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
export const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

/**
 * Groq free-tier models verified against Groq's published rate-limit table
 * and the live /models catalog (2026-09-29). The free tier needs no payment
 * method and throttles with 429 past its allowance — it cannot bill.
 * A model id only lands here after that evidence exists for it; admitting an
 * unverified id would be the silent paid-fallback the policy exists to block.
 */
export const GROQ_FREE_MODELS: ReadonlySet<string> = new Set([
  'qwen/qwen3.8-27b',
  'qwen/qwen3-32b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'openai/gpt-oss-safeguard-20b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'moonshotai/kimi-k2-instruct',
  'allam-2-7b'
]);

/**
 * Gemini API free-tier models (AI Studio free tier). Documented free usage
 * tier; requests beyond the free allowance return 429 rather than billing
 * when no billing account is linked.
 */
export const GEMINI_FREE_MODELS: ReadonlySet<string> = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite'
]);

const PROVIDER_ENDPOINTS: Record<string, string> = {
  openrouter: OPENROUTER_ENDPOINT,
  groq: GROQ_ENDPOINT,
  gemini: GEMINI_ENDPOINT
};

export interface ModelPolicyResult {
  eligible: boolean;
  reason: string;
  provider: string;
  model: string;
  costPolicy: typeof ZERO_COST_POLICY;
}

export function evaluateModelPolicy(providerInput?: string, modelInput?: string): ModelPolicyResult {
  const provider = (providerInput || '').trim().toLowerCase();
  const model = (modelInput || '').trim().toLowerCase();
  const result = (eligible: boolean, reason: string): ModelPolicyResult => ({
    eligible,
    reason,
    provider,
    model,
    costPolicy: ZERO_COST_POLICY
  });

  if (provider === 'mock' || provider === 'test') {
    return result(true, 'non-production test provider');
  }
  if (provider === 'openrouter') {
    if (model === OPENROUTER_FREE_MODEL) {
      return result(true, 'OpenRouter zero-cost router');
    }
    if (model.endsWith(':free') && /^[a-z0-9._-]+\/[a-z0-9._:-]+$/.test(model)) {
      return result(true, 'explicit OpenRouter free model variant');
    }
    return result(false, model ? 'model is not independently proven free' : 'model is not configured');
  }
  if (provider === 'groq') {
    return GROQ_FREE_MODELS.has(model)
      ? result(true, 'Groq free-tier model (verified free allowance)')
      : result(false, model ? 'model is not on the verified Groq free-tier list' : 'model is not configured');
  }
  if (provider === 'gemini') {
    return GEMINI_FREE_MODELS.has(model)
      ? result(true, 'Gemini API free-tier model')
      : result(false, model ? 'model is not on the verified Gemini free-tier list' : 'model is not configured');
  }
  return result(false, provider ? 'provider is not approved' : 'provider is not configured');
}

/**
 * Evaluate a full route: provider/model admission plus a present API key for
 * real providers. A route missing its key is ineligible — Kayla fails closed
 * to the next route rather than calling anything unauthenticated.
 */
export function evaluateRoutePolicy(route: KaylaRouteSpec): ModelPolicyResult {
  const base = evaluateModelPolicy(route.provider, route.model);
  if (!base.eligible) return base;
  const provider = base.provider;
  if (provider !== 'mock' && provider !== 'test' && !route.apiKey) {
    return { ...base, eligible: false, reason: 'route has no API key in server environment' };
  }
  return base;
}

/**
 * The endpoint a provider is allowed to call. Built-in providers resolve to
 * their fixed upstream URL; an endpoint override is only honoured for
 * openrouter and only when it equals the canonical one — anything else would
 * turn Kayla into an open proxy to an arbitrary model server.
 */
export function isApprovedProviderEndpoint(provider: string, endpoint?: string): boolean {
  const canonical = PROVIDER_ENDPOINTS[provider.toLowerCase()];
  if (!canonical) return !endpoint;
  return !endpoint || endpoint === canonical;
}

export function endpointForProvider(provider: string): string | undefined {
  return PROVIDER_ENDPOINTS[provider.toLowerCase()];
}

/**
 * Extra request headers a provider needs beyond Authorization. OpenRouter
 * asks for referer/title metadata for the free router; Groq and the Gemini
 * OpenAI-compatible endpoint need none.
 */
export function providerHeaders(provider: string): Record<string, string> {
  if (provider.toLowerCase() === 'openrouter') {
    return {
      'HTTP-Referer': 'https://forger-digital-solutions.github.io',
      'X-Title': 'Kayla Copilot - FDS'
    };
  }
  return {};
}
