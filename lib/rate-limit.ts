import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitOptions = { bucket: string; key: string; limit: number; windowMs: number };
type HeadersLike = { get(name: string): string | null };

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("RATE_LIMIT_UNAVAILABLE");
  return new Redis({ url, token });
}

function hash(value: string) { return createHash("sha256").update(value).digest("hex").slice(0, 24); }

export function getClientIp(headers: HeadersLike) {
  return (headers.get("x-vercel-forwarded-for") || headers.get("x-forwarded-for") || headers.get("x-real-ip") || "unknown").split(",")[0].trim().toLowerCase();
}
export function buildRateLimitKey(...parts: Array<string | number | null | undefined>) { return hash(parts.map((part) => String(part ?? "").trim().toLowerCase()).filter(Boolean).join(":")); }

export async function consumeRateLimit(options: RateLimitOptions) {
  const limiter = new Ratelimit({ redis: getRedis(), limiter: Ratelimit.fixedWindow(options.limit, `${Math.ceil(options.windowMs / 1000)} s`), prefix: "provascan:rl" });
  const result = await limiter.limit(`${options.bucket}:${options.key}`);
  const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  console.info(JSON.stringify({ event: "rate_limit", bucket: options.bucket, key: options.key, allowed: result.success }));
  return { ok: result.success, remaining: result.remaining, retryAfterSeconds, resetAt: result.reset };
}
