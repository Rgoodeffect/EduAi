import { Redis } from "ioredis";
import { getEnv } from "@infrastructure/config/env";

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

/**
 * Lazily constructs the shared ioredis client on first use rather than at
 * module import time. Next.js imports route modules during the production
 * build to collect metadata, without runtime env vars present — eagerly
 * reading `getEnv()` at the top level would fail that step.
 */
export function getRedisClient(): Redis {
  if (global.__redis) return global.__redis;

  const env = getEnv();
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ workers/connections
  });

  if (process.env.NODE_ENV !== "production") {
    global.__redis = client;
  }
  return client;
}
