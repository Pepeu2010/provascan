import { randomBytes } from "node:crypto";
import { Redis } from "@upstash/redis";

export type ChallengeKind = "TOTP_SETUP";
export type MfaChallenge = { id: string; userId: string; kind: ChallengeKind; secret?: string; expiresAt: number; attempts: number; verified: boolean };

const memory = new Map<string, MfaChallenge>();
const MAX_ATTEMPTS = 5;
const TTL_MS = 5 * 60 * 1000;

function redis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}
function key(id: string) { return `provascan:mfa-challenge:${id}`; }

export async function createChallenge(input: Omit<MfaChallenge, "id" | "expiresAt" | "attempts" | "verified">) {
  const challenge: MfaChallenge = { ...input, id: randomBytes(24).toString("base64url"), expiresAt: Date.now() + TTL_MS, attempts: 0, verified: false };
  const store = redis();
  if (store) { await store.set(key(challenge.id), challenge, { px: TTL_MS }); return challenge; }
  if (process.env.NODE_ENV === "production") throw new Error("MFA_CHALLENGE_STORE_UNAVAILABLE");
  memory.set(challenge.id, challenge);
  return challenge;
}
export async function getChallenge(id: string, userId: string, kind?: ChallengeKind) {
  const store = redis();
  const value = store ? await store.get<MfaChallenge>(key(id)) : memory.get(id);
  if (!value || value.userId !== userId || value.expiresAt <= Date.now() || value.attempts >= MAX_ATTEMPTS || (kind && value.kind !== kind)) return null;
  return value;
}
export async function invalidateChallenge(id: string) { const store = redis(); if (store) await store.del(key(id)); else memory.delete(id); }

// Sem Redis, apenas desenvolvimento de instância única usa memória efêmera.
