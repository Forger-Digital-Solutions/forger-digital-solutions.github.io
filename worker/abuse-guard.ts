interface StorageLike {
  get<T>(key: string): Promise<T | undefined>;
  put(entries: Record<string, unknown>): Promise<void>;
}
interface DurableStateLike { storage: StorageLike; }

interface RateState { minuteStart: number; minuteCount: number; hourStart: number; hourCount: number; }
interface BudgetState { day: string; count: number; }

export class KaylaAbuseGuard {
  constructor(private readonly state: DurableStateLike) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/ping') return Response.json({ ready: true });
    if (request.method !== 'POST') return Response.json({ allowed: false }, { status: 405 });
    let input: Record<string, unknown>;
    try { input = await request.json() as Record<string, unknown>; } catch { return Response.json({ allowed: false }, { status: 400 }); }
    if (url.pathname === '/rate') return this.consumeRate(input);
    if (url.pathname === '/ai-budget') return this.consumeBudget(input);
    return Response.json({ allowed: false }, { status: 404 });
  }

  private async consumeRate(input: Record<string, unknown>): Promise<Response> {
    const now = finite(input.now, Date.now());
    const minuteLimit = boundedInt(input.minuteLimit, 1, 100, 5);
    const hourLimit = boundedInt(input.hourLimit, minuteLimit, 1000, 20);
    const minuteMs = 60_000;
    const hourMs = 3_600_000;
    const current = await this.state.storage.get<RateState>('rate') || { minuteStart: now, minuteCount: 0, hourStart: now, hourCount: 0 };
    if (now - current.minuteStart >= minuteMs || now < current.minuteStart) { current.minuteStart = now; current.minuteCount = 0; }
    if (now - current.hourStart >= hourMs || now < current.hourStart) { current.hourStart = now; current.hourCount = 0; }
    const allowed = current.minuteCount < minuteLimit && current.hourCount < hourLimit;
    if (allowed) { current.minuteCount += 1; current.hourCount += 1; await this.state.storage.put({ rate: current }); }
    return Response.json({ allowed, retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil(Math.min(current.minuteStart + minuteMs, current.hourStart + hourMs) - now) / 1000) });
  }

  private async consumeBudget(input: Record<string, unknown>): Promise<Response> {
    const limit = boundedInt(input.limit, 1, 10_000, 40);
    const now = new Date(finite(input.now, Date.now()));
    const day = now.toISOString().slice(0, 10);
    const current = await this.state.storage.get<BudgetState>('ai-budget') || { day, count: 0 };
    if (current.day !== day) { current.day = day; current.count = 0; }
    const allowed = current.count < limit;
    if (allowed) { current.count += 1; await this.state.storage.put({ 'ai-budget': current }); }
    return Response.json({ allowed });
  }
}

function finite(value: unknown, fallback: number): number { return typeof value === 'number' && Number.isFinite(value) ? value : fallback; }
function boundedInt(value: unknown, min: number, max: number, fallback: number): number { const parsed = typeof value === 'number' ? Math.floor(value) : NaN; return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback; }

export async function createLimiterIdentifier(salt: string, rawIp: string): Promise<string | null> {
  if (!salt || salt.length < 16 || !rawIp || rawIp.length > 128 || /[\r\n]/.test(rawIp)) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}\u0000${rawIp}`));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
