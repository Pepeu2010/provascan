import { randomBytes } from "node:crypto";
import { Secret, TOTP } from "otpauth";

export function createTotpSetup(access: string) {
  const secret = new Secret({ size: 20 }).base32;
  const totp = new TOTP({ issuer: "ProvaScan", label: access, secret, digits: 6, period: 30 });
  return { secret, otpauthUri: totp.toString() };
}
export function verifyTotp(secret: string, code: string) {
  const totp = new TOTP({ issuer: "ProvaScan", secret, digits: 6, period: 30 });
  return totp.validate({ token: code, window: 1 }) !== null;
}
export function createRecoveryCodes() {
  return Array.from({ length: 8 }, () => `${randomBytes(4).toString("hex").toUpperCase().slice(0, 4)}-${randomBytes(4).toString("hex").toUpperCase().slice(0, 4)}`);
}
