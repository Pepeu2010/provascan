import { createHash } from "node:crypto";
import { compare, hash } from "bcryptjs";

export type PasswordFormat = "PLAIN" | "BCRYPT";

// Keeps rejected login attempts on the bcrypt path without introducing a real
// credential. This prevents the response time from revealing account status.
const LOGIN_VERIFICATION_PLACEHOLDER_HASH = "$2b$12$/fIgrAJX.3U6jBvgFmh86eLf5lR4WYTLUlJerATAjbuh1JHNL.xv2";

export function getPasswordFormat(storedPassword: string, declaredFormat?: string): PasswordFormat {
  const bcryptPrefix = storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$");
  if (declaredFormat?.trim().toUpperCase() === "BCRYPT" || bcryptPrefix) return "BCRYPT";
  return "PLAIN";
}

export async function verifyPassword(plainTextPassword: string, storedPassword: string, declaredFormat?: string) {
  if (getPasswordFormat(storedPassword, declaredFormat) === "BCRYPT") {
    return compare(plainTextPassword, storedPassword);
  }

  const matches = plainTextPassword === storedPassword;
  await burnPasswordVerification(plainTextPassword);
  return matches;
}

export async function burnPasswordVerification(plainTextPassword: string) {
  await compare(plainTextPassword, LOGIN_VERIFICATION_PLACEHOLDER_HASH);
}

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export function validateNewPassword(password: string, access: string) {
  const normalized = password.trim().toLowerCase();
  if (password.length < 10) return "Use pelo menos 10 caracteres.";
  const hasLetter = Array.from(password).some((character) => character.toLocaleLowerCase("pt-BR") !== character.toLocaleUpperCase("pt-BR"));
  const hasNumber = Array.from(password).some((character) => character >= "0" && character <= "9");
  if (!hasLetter || !hasNumber) return "Use ao menos uma letra e um número.";
  if (["123456", "12345678", "senha", "password", "qwerty"].some((weak) => normalized.includes(weak))) {
    return "Escolha uma senha menos previsível.";
  }
  if (access.trim() && normalized.includes(access.trim().toLowerCase())) return "A senha não pode conter seu nome de acesso.";
  return null;
}

export function createPasswordStamp(storedPassword: string) {
  return createHash("sha256").update(storedPassword).digest("hex");
}
