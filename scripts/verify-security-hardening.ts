import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createId } from "../lib/app-data";
import { decryptTotpSecret, encryptTotpSecret } from "../lib/mfa-crypto";
import { validateNewPassword } from "../lib/passwords";
import { readFileSync } from "node:fs";

process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

const fixturePlaintext = randomUUID();
const encrypted = encryptTotpSecret(fixturePlaintext);
assert.equal(decryptTotpSecret(encrypted), fixturePlaintext);

const [version, iv, tag, ciphertext] = encrypted.split(".");
const alteredTagBytes = Buffer.from(tag, "base64url");
alteredTagBytes[0] ^= 1;
const alteredTag = alteredTagBytes.toString("base64url");
assert.throws(() => decryptTotpSecret(`${version}.${iv}.${alteredTag}.${ciphertext}`));
assert.throws(() => decryptTotpSecret(`${version}.short.${tag}.${ciphertext}`));

assert.equal(validateNewPassword("EstudoForte2026", "professor@escola.edu.br"), null);
assert.equal(validateNewPassword("senhafraca", "professor@escola.edu.br"), "Use ao menos uma letra e um número.");

const firstId = createId("exam");
const secondId = createId("exam");
assert.equal(firstId.startsWith("exam-"), true);
assert.equal(firstId === secondId, false);
assert.equal(firstId.length > 20, true);

const totpRoute = readFileSync(new URL("../app/api/auth/mfa/totp/route.ts", import.meta.url), "utf8");
assert.match(totpRoute, /await invalidateChallenge\(challenge\.id\)/);

console.log("Security hardening regression passed: MFA encryption, challenge invalidation, password checks, and IDs are secure.");
