import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";

export class OperationalLockUnavailableError extends Error {}
export class OperationalLockBusyError extends Error {}

function redis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new OperationalLockUnavailableError("Lock distribuído indisponível.");
  return new Redis({ url, token });
}

export async function withOperationalWriteLock<T>(spreadsheetId: string, operation: () => Promise<T>) {
  const client = redis();
  const key = `provascan:lock:${spreadsheetId}`;
  const owner = randomUUID();
  const acquired = await client.set(key, owner, { nx: true, px: 30_000 });
  if (acquired !== "OK") throw new OperationalLockBusyError("Outra alteração está sendo salva. Tente novamente.");
  try { return await operation(); }
  finally {
    if ((await client.get<string>(key)) === owner) await client.del(key);
  }
}
