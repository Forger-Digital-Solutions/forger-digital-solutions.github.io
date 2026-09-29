import type { KaylaRouteSpec } from '../../data/kayla/types';

export interface KaylaConfig {
  enabled: boolean;
  provider: string;
  model: string;
  apiKey: string;
  endpoint: string;
  maxMessageLength: number;
  maxHistoryMessages: number;
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  aiDailyRequestLimit: number;
  maxPayloadBytes: number;
  maxObjectDepth: number;
  requestTimeoutMs: number;
  maxRetries: number;
}

export interface KaylaEnv {
  KAYLA_ENABLED?: string;
  KAYLA_PROVIDER?: string;
  KAYLA_MODEL?: string;
  KAYLA_API_KEY?: string;
  KAYLA_ENDPOINT?: string;
  /**
   * Kayla 2.0 — ordered provider chain, pipe-separated "provider:model"
   * entries, e.g. "groq:qwen/qwen3.8-27b|openrouter:openrouter/free".
   * Each entry's key is read from "<PROVIDER>_API_KEY" (GROQ_API_KEY,
   * OPENROUTER_API_KEY, GEMINI_API_KEY), falling back to KAYLA_API_KEY for
   * backward compatibility with the original single-provider deployment.
   */
  KAYLA_ROUTES?: string;
  /** Operator header token; gates the detailed fields of /api/kayla/health. */
  KAYLA_OPS_TOKEN?: string;
  KAYLA_MAX_MESSAGE_LENGTH?: string;
  KAYLA_MAX_HISTORY_MESSAGES?: string;
  KAYLA_RATE_LIMIT_PER_MINUTE?: string;
  KAYLA_RATE_LIMIT_PER_HOUR?: string;
  KAYLA_AI_DAILY_REQUEST_LIMIT?: string;
  KAYLA_MAX_PAYLOAD_BYTES?: string;
  KAYLA_MAX_OBJECT_DEPTH?: string;
  KAYLA_RATE_LIMIT_SALT?: string;
  KAYLA_REQUEST_TIMEOUT_MS?: string;
  KAYLA_MAX_RETRIES?: string;
  KAYLA_ALLOWED_ORIGINS?: string;
  /** Per-provider key variables resolved for routes, e.g. GROQ_API_KEY. */
  [key: `KAYLA_${string}`]: string | undefined;
  GROQ_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  GEMINI_API_KEY?: string;
}

function getEnvValue(env: KaylaEnv | Record<string, string | undefined>, key: string, fallback: string = ''): string {
  const val = (env as Record<string, string | undefined>)[key] || fallback;
  return val;
}

function getEnvNumber(env: KaylaEnv | Record<string, string | undefined>, key: string, fallback: number): number {
  const val = getEnvValue(env, key);
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? fallback : parsed;
}

function getEnvBool(env: KaylaEnv | Record<string, string | undefined>, key: string, fallback: boolean): boolean {
  const val = getEnvValue(env, key);
  if (!val) return fallback;
  return val.toLowerCase() === 'true' || val === '1';
}

export function createKaylaConfig(env: KaylaEnv | Record<string, string | undefined> = typeof process !== 'undefined' ? process.env : {}): KaylaConfig {
  return {
    enabled: getEnvBool(env, 'KAYLA_ENABLED', false),
    provider: getEnvValue(env, 'KAYLA_PROVIDER', ''),
    model: getEnvValue(env, 'KAYLA_MODEL', 'openrouter/free'),
    apiKey: getEnvValue(env, 'KAYLA_API_KEY', ''),
    endpoint: getEnvValue(env, 'KAYLA_ENDPOINT', ''),
    maxMessageLength: getEnvNumber(env, 'KAYLA_MAX_MESSAGE_LENGTH', 2000),
    maxHistoryMessages: getEnvNumber(env, 'KAYLA_MAX_HISTORY_MESSAGES', 10),
    rateLimitPerMinute: getEnvNumber(env, 'KAYLA_RATE_LIMIT_PER_MINUTE', 5),
    rateLimitPerHour: getEnvNumber(env, 'KAYLA_RATE_LIMIT_PER_HOUR', 60),
    aiDailyRequestLimit: getEnvNumber(env, 'KAYLA_AI_DAILY_REQUEST_LIMIT', 40),
    maxPayloadBytes: getEnvNumber(env, 'KAYLA_MAX_PAYLOAD_BYTES', 16384),
    maxObjectDepth: getEnvNumber(env, 'KAYLA_MAX_OBJECT_DEPTH', 6),
    requestTimeoutMs: getEnvNumber(env, 'KAYLA_PROVIDER_TIMEOUT_MS', getEnvNumber(env, 'KAYLA_REQUEST_TIMEOUT_MS', 9000)),
    maxRetries: 0
  };
}

export function getKaylaConfig(): KaylaConfig {
  return createKaylaConfig();
}

export function isAIEnabled(config: KaylaConfig): boolean {
  if (!config.enabled) return false;
  if (!config.provider || config.provider.toLowerCase() === 'none') return false;
  if (config.provider.toLowerCase() !== 'mock' && config.provider.toLowerCase() !== 'test' && !config.apiKey) {
    return false;
  }
  return true;
}

export function getRateLimitSalt(env: KaylaEnv | Record<string, string | undefined> = {}): string {
  return getEnvValue(env, 'KAYLA_RATE_LIMIT_SALT', '');
}

export function getAllowedOrigins(env: KaylaEnv | Record<string, string | undefined> = {}): string[] {
  const raw = getEnvValue(env, 'KAYLA_ALLOWED_ORIGINS', '');
  if (!raw) return [];
  return raw.split(',').map(o => o.trim()).filter(Boolean);
}

export function getOpsToken(env: KaylaEnv | Record<string, string | undefined> = {}): string {
  return getEnvValue(env, 'KAYLA_OPS_TOKEN', '');
}

/** A route entry in KAYLA_ROUTES: letters, digits, . _ - / : only. */
const ROUTE_ENTRY = /^([a-z0-9._-]+):([a-z0-9._:/-]+)$/i;

/**
 * Name of the environment variable holding a provider's API key. The key
 * itself never lives in KAYLA_ROUTES — the variable name is what routes
 * carry, and the value only ever exists in server secrets.
 */
export function keyEnvForProvider(provider: string): string {
  return `${provider.trim().toUpperCase()}_API_KEY`;
}

/**
 * Resolve the ordered inference chain. KAYLA_ROUTES wins; a legacy
 * KAYLA_PROVIDER + KAYLA_MODEL + KAYLA_API_KEY deployment still produces its
 * single original route so older configs keep working. Entries that fail to
 * parse are skipped rather than fatal — one bad entry must not take down the
 * whole assistant — but a skipped entry is not silent: the caller logs the
 * parsed count against the configured count.
 */
export function getRouteSpecs(env: KaylaEnv | Record<string, string | undefined>): KaylaRouteSpec[] {
  const config = createKaylaConfig(env);
  const raw = getEnvValue(env, 'KAYLA_ROUTES', '');
  const specs: KaylaRouteSpec[] = [];

  if (raw.trim()) {
    for (const entry of raw.split('|')) {
      const match = ROUTE_ENTRY.exec(entry.trim());
      if (!match) continue;
      const provider = match[1].toLowerCase();
      const model = match[2];
      const keyEnv = keyEnvForProvider(provider);
      const apiKey = getEnvValue(env, keyEnv) || config.apiKey;
      specs.push({ id: `${provider}:${model}`, provider, model, apiKey });
    }
    return specs;
  }

  // Legacy single-provider deployment.
  if (config.provider && config.provider.toLowerCase() !== 'none') {
    specs.push({
      id: `${config.provider.toLowerCase()}:${config.model}`,
      provider: config.provider.toLowerCase(),
      model: config.model,
      apiKey: config.apiKey,
      endpoint: config.endpoint || undefined
    });
  }
  return specs;
}
