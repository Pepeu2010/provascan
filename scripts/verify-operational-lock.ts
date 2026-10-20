import assert from "node:assert/strict";
import { OperationalLockBusyError, OperationalLockUnavailableError, assertOperationalWriteLock, getOperationalWriteCacheValue, runWithOperationalLease, setOperationalWriteCacheValue } from "../lib/operational-lock";

class FakeRedis {
  private values = new Map<string, { owner: string; expires: number }>();
  async set(key: string, owner: string, options: { nx: true; px: number }) {
    const current = this.values.get(key);
    if (current && current.expires > Date.now()) return null;
    this.values.set(key, { owner, expires: Date.now() + options.px });
    return "OK";
  }
  async eval(script: string, keys: string[], args: string[]) {
    const [key] = keys;
    const [owner, ttl] = args;
    const current = this.values.get(key);
    if (!current || current.expires <= Date.now() || current.owner !== owner) return 0;
    if (script.includes("pexpire")) { current.expires = Date.now() + Number(ttl); return 1; }
    this.values.delete(key);
    return 1;
  }
  steal(key: string, owner: string) { this.values.set(key, { owner, expires: Date.now() + 500 }); }
  owner(key: string) { return this.values.get(key)?.owner; }
}
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const redis = new FakeRedis();
  let active = 0;
  let maxActive = 0;
  const run = (owner: string, duration: number) => runWithOperationalLease(redis, "table", owner, async () => {
    active += 1; maxActive = Math.max(maxActive, active);
    await delay(duration);
    assertOperationalWriteLock();
    active -= 1;
    return owner;
  }, { ttlMs: 30, renewEveryMs: 8, acquireTimeoutMs: 200, retryEveryMs: 5 });

  const first = run("owner-a", 80);
  await delay(5);
  const second = run("owner-b", 5);
  assert.equal(await first, "owner-a");
  assert.equal(await second, "owner-b");
  assert.equal(maxActive, 1, "requisições concorrentes entraram simultaneamente na seção crítica");
  assert.equal(redis.owner("table"), undefined, "liberação não removeu o lock após validação do owner");

  await assert.rejects(runWithOperationalLease(redis, "table", "owner-c", async () => { throw new Error("falha simulada"); }, { ttlMs: 50, renewEveryMs: 10 }), /falha simulada/);
  assert.equal(redis.owner("table"), undefined, "lock não foi liberado após erro da operação");

  await assert.rejects(runWithOperationalLease(redis, "table", "owner-d", async () => {
    redis.steal("table", "owner-e");
    await delay(30);
    assertOperationalWriteLock();
  }, { ttlMs: 100, renewEveryMs: 10 }), OperationalLockUnavailableError);
  assert.equal(redis.owner("table"), "owner-e", "liberação do owner antigo removeu lock de terceiro");

  const held = runWithOperationalLease(redis, "table", "owner-f", async () => delay(80), { ttlMs: 100, renewEveryMs: 20 });
  await delay(2);
  await assert.rejects(runWithOperationalLease(redis, "table", "owner-g", async () => {}, { ttlMs: 100, renewEveryMs: 20, acquireTimeoutMs: 20, retryEveryMs: 2 }), OperationalLockBusyError);
  await held;
  assert.equal(redis.owner("table"), undefined, "lock não recuperou após contenção/timeout");

  assert.equal(getOperationalWriteCacheValue("sheets:table"), undefined, "cache de escrita vazou para fora do lease");
  await runWithOperationalLease(redis, "table", "owner-cache-a", async () => {
    setOperationalWriteCacheValue("sheets:table", { rows: [1] });
    assert.deepEqual(getOperationalWriteCacheValue("sheets:table"), { rows: [1] }, "cache não ficou disponível dentro do lease");
  });
  assert.equal(getOperationalWriteCacheValue("sheets:table"), undefined, "cache do primeiro lease vazou para o próximo request");
  await runWithOperationalLease(redis, "table", "owner-cache-b", async () => {
    assert.equal(getOperationalWriteCacheValue("sheets:table"), undefined, "lease novo reutilizou cache de outro request");
  });
  console.log("Lock operacional: concorrência serializada, renovação, timeout, perda de lease, owner-only release e recuperação verificados.");
}

void main();
