/**
 * Counts one request against `key` and says whether it is still within `limit` per
 * `windowMs`. Return `false` to refuse it. May be async, for a shared store such as
 * Redis or Cloudflare KV.
 */
export type RateLimiter = (
  key: string,
  limit: number,
  windowMs: number,
) => boolean | Promise<boolean>;

// Past this many keys, expired ones are swept; if a flood of distinct keys fills it
// anyway, it is cleared, so memory stays bounded at the cost of a lenient minute.
const MAX_KEYS = 10_000;

/** Fixed windows, counted in this process only. */
export function createMemoryRateLimiter(): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (key, limit, windowMs) => {
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      if (hits.size >= MAX_KEYS) {
        for (const [k, e] of hits) if (e.resetAt <= now) hits.delete(k);
        if (hits.size >= MAX_KEYS) hits.clear();
      }
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    return entry.count <= limit;
  };
}
