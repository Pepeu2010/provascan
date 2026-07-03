import bcrypt from "bcryptjs";

const BCRYPT_PREFIXES = ["$2a$", "$2b$", "$2x$", "$2y$"];

function isBcryptHash(value: string) {
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
