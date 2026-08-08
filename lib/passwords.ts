import { createHash } from "node:crypto";
import { compare, hash } from "bcryptjs";

export type PasswordFormat = "PLAIN" | "BCRYPT";

export function getPasswordFormat(storedPassword: string, declaredFormat?: string): PasswordFormat {
  const bcryptPrefix = storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$");
  if (declaredFormat?.trim().toUpperCase() === "BCRYPT" || bcryptPrefix) return "BCRYPT";
  return "PLAIN";
}

export async function verifyPassword(plainTextPassword: string, storedPassword: string, declaredFormat?: string) {
  return getPasswordFormat(storedPassword, declaredFormat) === "BCRYPT"
    ? compare(plainTextPassword, storedPassword)
    : plainTextPassword === storedPassword;
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
