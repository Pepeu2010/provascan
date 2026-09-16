import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { getMfaPolicy, getNextAuthStep, hasConfiguredTotp } from "../lib/auth-flow";
import type { UserRecord } from "../types/auth";

const configuredTotpValue = randomUUID();

function user(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    ativo: "SIM", email: "professor@escola.edu.br", id: "user-1", mfa_ativo: "NAO", mfa_metodo: "", mfa_secret_encrypted: "", nome: "Professor", perfil: "professor", senha: `fixture-${randomUUID()}`, trocar_senha: "NAO", ...overrides,
  };
}

assert.equal(getNextAuthStep(user({ mfa_ativo: "SIM", mfa_metodo: "TOTP", mfa_secret_encrypted: "" })), "MFA_METHOD");
assert.equal(hasConfiguredTotp(user({ mfa_ativo: "SIM", mfa_metodo: "TOTP", mfa_secret_encrypted: configuredTotpValue })), true);
assert.equal(getNextAuthStep(user({ mfa_ativo: "SIM", mfa_metodo: "TOTP", mfa_secret_encrypted: configuredTotpValue })), "TOTP_VERIFY");

const previousMfaPolicy = process.env.MFA_REQUIRED;
process.env.MFA_REQUIRED = "true";
assert.equal(getMfaPolicy(user()).required, true);
const exemptUser = { ...user(), mfa_isento: "SIM" } as UserRecord;
assert.equal((getMfaPolicy as (currentUser: UserRecord) => { required: boolean })(exemptUser).required, false);
if (previousMfaPolicy === undefined) delete process.env.MFA_REQUIRED;
else process.env.MFA_REQUIRED = previousMfaPolicy;

const loginRoute = readFileSync(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8");
assert.match(loginRoute, /const policy = getMfaPolicy\(user\)/);
assert.match(loginRoute, /if \(!policy\.required && !shouldForcePasswordChange\(user\.trocar_senha\)\)[\s\S]*createUserSession/);

console.log("Auth flow regression passed: MFA remains enforced by default and allows an explicit server-side exemption.");
