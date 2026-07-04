import { createHash } from "node:crypto";

export async function verifyPassword(plainTextPassword: string, storedPassword: string) {
  return plainTextPassword === storedPassword;
}

export function createPasswordStamp(storedPassword: string) {
  return createHash("sha256").update(storedPassword).digest("hex");
}
