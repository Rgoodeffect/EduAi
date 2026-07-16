import { Redis } from "ioredis";
import { getEnv } from "@infrastructure/config/env";

/**
 * BullMQ recommends each Queue/Worker/QueueEvents use its own Redis
 * connection rather than sharing one (Workers issue blocking commands that
 * would otherwise starve other consumers of that connection). This factory
 * is called once per Queue/Worker instance; it is intentionally *not*
 * memoized like `getRedisClient()`.
 */
export function createQueueConnection(): Redis {
  const env = getEnv();
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
}
