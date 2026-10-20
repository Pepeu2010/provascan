import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { Redis } from "@upstash/redis";

export class OperationalLockUnavailableError extends Error {}
export class OperationalLockBusyError extends Error {}
type OperationalLeaseContext = { lost: boolean; requestCache: Map<string, unknown> };
const activeLock = new AsyncLocalStorage<OperationalLeaseContext>();
const LOCK_TTL_MS = 30_000;
const RENEW_SCRIPT = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return 0 end";
const RELEASE_SCRIPT = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
type LeaseClient = { set: (key: string, value: string, options: { nx: true; px: number }) => Promise<unknown>; eval: (script: string, keys: string[], args: string[]) => Promise<unknown> };

function redis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new OperationalLockUnavailableError("Lock distribuído indisponível.");
  return new Redis({ url, token });
}

/** Must run immediately before every external mutation made under this lease. */
export function assertOperationalWriteLock(): void {
  if (activeLock.getStore()?.lost) throw new OperationalLockUnavailableError("O bloqueio de gravação foi perdido; alteração cancelada com segurança.");
}

/** Request-scoped memoization that exists only while the distributed write lease is held. */
export function getOperationalWriteCacheValue<T>(key: string): T | undefined {
  return activeLock.getStore()?.requestCache.get(key) as T | undefined;
}

export function setOperationalWriteCacheValue<T>(key: string, value: T): void {
  activeLock.getStore()?.requestCache.set(key, value);
}

export async function runWithOperationalLease<T>(client: LeaseClient, key: string, owner: string, operation: () => Promise<T>, options: { ttlMs?: number; renewEveryMs?: number; acquireTimeoutMs?: number; retryEveryMs?: number } = {}): Promise<T> {
  const ttlMs = options.ttlMs ?? LOCK_TTL_MS;
  const renewEveryMs = options.renewEveryMs ?? Math.floor(ttlMs / 3);
  const acquireTimeoutMs = options.acquireTimeoutMs ?? 3_000;
  const retryEveryMs = options.retryEveryMs ?? 100;
  const deadline = Date.now() + acquireTimeoutMs;
  let acquired = false;
  do {
    if (await client.set(key, owner, { nx: true, px: ttlMs }) === "OK") { acquired = true; break; }
    if (Date.now() >= deadline) break;
    await new Promise((resolve) => setTimeout(resolve, Math.min(retryEveryMs, Math.max(1, deadline - Date.now()))));
  } while (Date.now() <= deadline);
  if (!acquired) throw new OperationalLockBusyError("Outra alteração está sendo salva. Tente novamente.");
  const lease: OperationalLeaseContext = { lost: false, requestCache: new Map() };
  let renewing = false;
  const timer = setInterval(() => {
    if (renewing || lease.lost) return;
    renewing = true;
    void client.eval(RENEW_SCRIPT, [key], [owner, String(ttlMs)])
      .then((result) => { if (Number(result) !== 1) lease.lost = true; })
      .catch(() => { lease.lost = true; })
      .finally(() => { renewing = false; });
  }, renewEveryMs);
  timer.unref?.();
  try {
    const result = await activeLock.run(lease, operation);
    assertOperationalWriteLock();
    return result;
  } finally {
    clearInterval(timer);
    await client.eval(RELEASE_SCRIPT, [key], [owner]);
  }
}

export async function withOperationalWriteLock<T>(spreadsheetId: string, operation: () => Promise<T>): Promise<T> {
  const inherited = activeLock.getStore();
  if (inherited) {
    assertOperationalWriteLock();
    return operation();
  }
  const client = redis();
  const key = `provascan:lock:${spreadsheetId}`;
  return runWithOperationalLease(client, key, randomUUID(), operation);
}
