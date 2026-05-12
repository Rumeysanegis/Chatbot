import { getRedis } from "@/lib/db/redis";

// IP-keyed fixed-window rate limit. 5 requests per 5 minutes by default.
// If Redis isn't configured (local dev without Upstash), this becomes a no-op
// — log once and allow the request, so local dev doesn't require Upstash.

const WINDOW_SECONDS = 5 * 60;
// Meşru bir konuşma 6+ mesaj (intent, şirket, rol, ekip, aciliyet, email) →
// 5dk'da 5 limit tek bir gerçek konuşmayı bile bloklar. 20 makul: meşru
// kullanıcıya bol, scripted bot trafiğine (saniyede onlarca) hala sıkı.
const MAX_REQUESTS = 20;

let warnedAboutMissingRedis = false;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  try {
    const redis = getRedis();
    const key = `rl:chat:${ip}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }
    const ttl = await redis.ttl(key);
    return {
      allowed: count <= MAX_REQUESTS,
      remaining: Math.max(0, MAX_REQUESTS - count),
      resetInSeconds: ttl > 0 ? ttl : WINDOW_SECONDS,
    };
  } catch (err) {
    if (!warnedAboutMissingRedis) {
      console.error(
        "[rate-limit] Redis unavailable, allowing all requests:",
        err instanceof Error ? err.message : err,
      );
      warnedAboutMissingRedis = true;
    }
    return { allowed: true, remaining: MAX_REQUESTS, resetInSeconds: WINDOW_SECONDS };
  }
}
