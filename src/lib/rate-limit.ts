import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const buckets = new Map<string, { count: number; resetAt: number }>();
const distributedLimiters = new Map<string, Ratelimit>();
const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis =
  redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;
let warnedAboutFallback = false;

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  if (redis) {
    const limiterKey = `${limit}:${windowMs}`;
    let limiter = distributedLimiters.get(limiterKey);
    if (!limiter) {
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          limit,
          `${Math.ceil(windowMs / 1000)} s`,
        ),
        prefix: `pgm-direct:ratelimit:${limiterKey}`,
      });
      distributedLimiters.set(limiterKey, limiter);
    }

    try {
      const result = await limiter.limit(key);
      return {
        allowed: result.success,
        retryAfterMs: Math.max(result.reset - Date.now(), 0),
      };
    } catch (error) {
      console.error("Distributed rate limiter unavailable", error);
    }
  } else if (process.env.NODE_ENV === "production" && !warnedAboutFallback) {
    warnedAboutFallback = true;
    console.warn(
      "Upstash Redis REST credentials are not configured; rate limiting is per instance",
    );
  }

  return rateLimitInMemory(key, limit, windowMs);
}

function rateLimitInMemory(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
