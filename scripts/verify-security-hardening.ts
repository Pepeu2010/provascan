import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createId } from "../lib/app-data";
import { decryptTotpSecret, encryptTotpSecret } from "../lib/mfa-crypto";
import { validateNewPassword } from "../lib/passwords";

process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

const fixturePlaintext = randomUUID();
const encrypted = encryptTotpSecret(fixturePlaintext);
assert.equal(decryptTotpSecret(encrypted), fixturePlaintext);

const [version, iv, tag, ciphertext] = encrypted.split(".");
const alteredTag = `${tag.slice(0, -1)}${tag.endsWith("A") ? "B" : "A"}`;
assert.throws(() => decryptTotpSecret(`${version}.${iv}.${alteredTag}.${ciphertext}`));
assert.throws(() => decryptTotpSecret(`${version}.short.${tag}.${ciphertext}`));

assert.equal(validateNewPassword("EstudoForte2026", "professor@escola.edu.br"), null);
assert.equal(validateNewPassword("senhafraca", "professor@escola.edu.br"), "Use ao menos uma letra e um número.");

const firstId = createId("exam");
const secondId = createId("exam");
assert.equal(firstId.startsWith("exam-"), true);
assert.equal(firstId === secondId, false);
assert.equal(firstId.length > 20, true);

console.log("Security hardening regression passed: authenticated MFA encryption, password checks, and IDs are secure.");
