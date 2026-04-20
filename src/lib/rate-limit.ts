import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function redisFromEnv(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = redisFromEnv();

/** Credential sign-in attempts per IP (sliding window). */
export const loginRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(25, "5 m"),
      prefix: "rl:login",
    })
  : null;

/** Import assist + transcription and similar costly APIs. */
export const expensiveApiRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(40, "1 m"),
      prefix: "rl:expensive",
    })
  : null;

export function clientIpFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const fromForwarded = forwarded?.split(",")[0]?.trim();
  return fromForwarded || req.headers.get("x-real-ip")?.trim() || "unknown";
}
