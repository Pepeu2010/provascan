type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
};

type HeadersLike = {
  get(name: string): string | null;
};

type GlobalRateLimitStore = typeof globalThis & {
  __provascanRateLimitStore?: Map<string, RateLimitEntry>;
};

function getStore() {
  const globalStore = globalThis as GlobalRateLimitStore;

  if (!globalStore.__provascanRateLimitStore) {
    globalStore.__provascanRateLimitStore = new Map<string, RateLimitEntry>();
  }

  return globalStore.__provascanRateLimitStore;
}

function cleanupExpiredEntries(now: number) {
  const store = getStore();

  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function getClientIp(headers: HeadersLike) {
  const forwardedFor = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const candidate = forwardedFor?.split(",")[0]?.trim() || realIp?.trim() || "unknown";
  return candidate.toLowerCase();
}

export function buildRateLimitKey(...parts: Array<string | number | null | undefined>) {
  return parts
    .map((part) => String(part ?? "").trim().toLowerCase())
    .filter(Boolean)
    .join(":");
}

export function consumeRateLimit(options: RateLimitOptions) {
  const now = Date.now();
  cleanupExpiredEntries(now);

  const store = getStore();
  const bucketKey = `${options.bucket}:${options.key}`;
  const existing = store.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    const nextEntry = {
      count: 1,
      resetAt: now + options.windowMs,
    };
    store.set(bucketKey, nextEntry);

    return {
      ok: true as const,
      remaining: Math.max(0, options.limit - nextEntry.count),
      retryAfterSeconds: Math.ceil(options.windowMs / 1000),
      resetAt: nextEntry.resetAt,
    };
  }

  if (existing.count >= options.limit) {
    return {
      ok: false as const,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  store.set(bucketKey, existing);

  return {
    ok: true as const,
    remaining: Math.max(0, options.limit - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    resetAt: existing.resetAt,
  };
}
