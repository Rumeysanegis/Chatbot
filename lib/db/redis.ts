import { Redis } from "@upstash/redis";

// Single source of truth for the Upstash Redis client.
// (Replaces deprecated @vercel/kv.)
// Vercel's Upstash integration injects UPSTASH_REDIS_REST_URL / _TOKEN.

let cached: Redis | null = null;

export function getRedis(): Redis {
  if (cached) return cached;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "[redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing",
    );
  }

  cached = new Redis({ url, token });
  return cached;
}
