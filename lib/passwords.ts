import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";

const BCRYPT_PREFIXES = ["$2a$", "$2b$", "$2x$", "$2y$"];

export function isBcryptHash(value: string) {
  return BCRYPT_PREFIXES.some((prefix) => value.startsWith(prefix));
}

export async function verifyPassword(plainTextPassword: string, storedPassword: string) {
  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(plainTextPassword, storedPassword);
  }

  return plainTextPassword === storedPassword;
}

export async function createStoredPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function createPasswordStamp(storedPassword: string) {
  return createHash("sha256").update(storedPassword).digest("hex");
}
