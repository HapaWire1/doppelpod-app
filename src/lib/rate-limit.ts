/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * NOTE: This is "best-effort" in a serverless environment — each function
 * instance has its own memory, so limits are not enforced globally across
 * concurrent instances. It still blocks burst abuse within a single instance
 * and is a meaningful improvement over no limiting at all.
 *
 * For strict global enforcement, swap the store for Upstash Redis:
 *   https://github.com/upstash/ratelimit
 */

interface Window {
  timestamps: number[];
}

// Module-level store — persists for the lifetime of the function instance.
const store = new Map<string, Window>();

// Prune old entries every 5 minutes to prevent unbounded memory growth.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, win] of store.entries()) {
      // Remove entries where all timestamps are older than 1 hour
      if (win.timestamps.every((t) => now - t > 60 * 60 * 1000)) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms when the oldest request leaves the window
}

/**
 * @param key       Unique identifier (e.g. "verify:<userId>", "feedback:<ip>")
 * @param limit     Max requests allowed within the window
 * @param windowMs  Window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key) ?? { timestamps: [] };

  // Drop timestamps outside the current window
  const recent = entry.timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    const resetAt = recent[0] + windowMs;
    store.set(key, { timestamps: recent });
    return { allowed: false, remaining: 0, resetAt };
  }

  recent.push(now);
  store.set(key, { timestamps: recent });
  return { allowed: true, remaining: limit - recent.length, resetAt: now + windowMs };
}
