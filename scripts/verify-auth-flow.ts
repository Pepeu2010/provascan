import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getNextAuthStep, hasConfiguredTotp } from "../lib/auth-flow";
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
console.log("Auth flow regression passed: incomplete MFA starts setup; configured MFA requests TOTP.");
