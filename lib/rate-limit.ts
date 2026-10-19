import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitOptions = { bucket: string; key: string; limit: number; windowMs: number };
type HeadersLike = { get(name: string): string | null };
const localWindows = new Map<string, { count: number; resetAt: number }>();

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function hash(value: string) { return createHash("sha256").update(value).digest("hex").slice(0, 24); }

export function getClientIp(headers: HeadersLike) {
  return (headers.get("x-vercel-forwarded-for") || headers.get("x-forwarded-for") || headers.get("x-real-ip") || "unknown").split(",")[0].trim().toLowerCase();
}
export function buildRateLimitKey(...parts: Array<string | number | null | undefined>) { return hash(parts.map((part) => String(part ?? "").trim().toLowerCase()).filter(Boolean).join(":")); }

export async function consumeRateLimit(options: RateLimitOptions) {
  const redis = getRedis();

  if (redis) {
    const limiter = new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(options.limit, `${Math.ceil(options.windowMs / 1000)} s`), prefix: "provascan:rl" });
    const result = await limiter.limit(`${options.bucket}:${options.key}`);
    const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    console.info(JSON.stringify({ event: "rate_limit", provider: "upstash", bucket: options.bucket, key: options.key, allowed: result.success }));
    return { ok: result.success, remaining: result.remaining, retryAfterSeconds, resetAt: result.reset };
  }

  const now = Date.now();
  const windowKey = `${options.bucket}:${options.key}`;
  let current = localWindows.get(windowKey);
  if (!current || current.resetAt <= now) {
    current = { count: 0, resetAt: now + options.windowMs };
    localWindows.set(windowKey, current);
  }
  current.count += 1;
  const allowed = current.count <= options.limit;
  const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  console.info(JSON.stringify({ event: "rate_limit", provider: "memory", bucket: options.bucket, key: options.key, allowed }));
  if (localWindows.size > 10_000) {
    for (const [key, window] of localWindows) if (window.resetAt <= now) localWindows.delete(key);
  }
  return { ok: allowed, remaining: Math.max(0, options.limit - current.count), retryAfterSeconds, resetAt: current.resetAt };
}
