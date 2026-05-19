type RateEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
};

const store = new Map<string, RateEntry>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
  }

  entry.count += 1;
  store.set(key, entry);

  const remaining = Math.max(0, limit - entry.count);
  const ok = entry.count <= limit;

  return {
    ok,
    remaining,
    resetAt: entry.resetAt,
    retryAfter: ok ? undefined : Math.ceil((entry.resetAt - now) / 1000),
  };
}
