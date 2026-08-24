export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60000;

export function checkRateLimit(identifier: string, maxRequests: number): RateLimitResult {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let entry = rateLimitStore.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(identifier, entry);
  }

  entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + WINDOW_MS - now;
    return {
      allowed: false,
      retryAfterMs: Math.max(retryAfterMs, 1000),
      remaining: 0
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: maxRequests - entry.timestamps.length
  };
}

export function clearRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

export function cleanupRateLimits(): void {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  for (const [key, entry] of rateLimitStore.entries()) {
    entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}
