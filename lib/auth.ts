import { z } from "zod";

export const AUTH_COOKIE_NAME = "provascan-auth";
const AUTH_MAX_AGE = 60 * 60 * 12;
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;
const FALLBACK_AUTH_SECRET = "change-this-auth-secret-in-production";

const sessionSchema = z.object({
  email: z.string().email(),
  exp: z.number().int().positive(),
  iat: z.number().int().positive(),
  remember: z.boolean(),
});

export type AuthSession = z.infer<typeof sessionSchema>;

export function getSessionDuration(remember: boolean) {
  return remember ? REMEMBER_MAX_AGE : AUTH_MAX_AGE;
}

function getAuthSecret() {
  return process.env.AUTH_SESSION_SECRET ?? FALLBACK_AUTH_SECRET;
}

function encodeBase64Url(value: Uint8Array) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return new Uint8Array(Buffer.from(`${normalized}${padding}`, "base64"));
}

async function importSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAuthSecret()),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign", "verify"],
  );
}

async function signValue(value: string) {
  const key = await importSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return encodeBase64Url(new Uint8Array(signature));
}

async function verifyValue(value: string, signature: string) {
  const key = await importSigningKey();
  return crypto.subtle.verify(
    "HMAC",
    key,
    decodeBase64Url(signature),
    new TextEncoder().encode(value),
  );
}

export async function createSessionToken(input: { email: string; remember: boolean }) {
  const now = Math.floor(Date.now() / 1000);
  const payload = sessionSchema.parse({
    email: input.email.trim().toLowerCase(),
    exp: now + getSessionDuration(input.remember),
    iat: now,
    remember: input.remember,
  });

  const serialized = JSON.stringify(payload);
  const encodedPayload = encodeBase64Url(new TextEncoder().encode(serialized));
  const signature = await signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function parseSessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) {
    return null;
  }

  const valid = await verifyValue(payloadPart, signaturePart);
  if (!valid) {
    return null;
  }

  try {
    const payloadText = new TextDecoder().decode(decodeBase64Url(payloadPart));
    const parsed = sessionSchema.parse(JSON.parse(payloadText));
    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp <= now) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
