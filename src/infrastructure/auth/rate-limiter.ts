import { getRedisClient } from "@infrastructure/queue/redis-client";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAtMs: number;
}

/**
 * Fixed-window rate limiter backed by Redis (INCR + EXPIRE), suitable across
 * multiple Next.js server instances since state lives outside the process.
 * Used to slow down brute-force attempts against auth endpoints.
 */
export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const redisKey = `ratelimit:${key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.pexpire(redisKey, windowMs);
  }
  const ttl = await redis.pttl(redisKey);
  const resetAtMs = Date.now() + (ttl > 0 ? ttl : windowMs);

  return {
    allowed: count <= maxRequests,
    remaining: Math.max(0, maxRequests - count),
    resetAtMs,
  };
}
