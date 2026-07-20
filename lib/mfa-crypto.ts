import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";

function key() {
  const raw = process.env.MFA_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("MFA_ENCRYPTION_KEY não configurada.");
  const value = Buffer.from(raw, "base64");
  if (value.length !== 32) throw new Error("MFA_ENCRYPTION_KEY deve ser uma chave Base64 de 32 bytes.");
  return value;
}

export function encryptTotpSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptTotpSecret(value: string) {
  const [version, ivRaw, tagRaw, ciphertextRaw] = value.split(".");
  if (version !== VERSION || !ivRaw || !tagRaw || !ciphertextRaw) throw new Error("Segredo MFA inválido.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextRaw, "base64url")), decipher.final()]).toString("utf8");
}
