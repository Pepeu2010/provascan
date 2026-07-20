import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import type { AuthStep } from "@/types/auth";

const schema = z.object({ sub: z.string().min(1), access: z.string().min(1), step: z.enum(["PASSWORD_CHANGE", "MFA_METHOD", "TOTP_SETUP", "TOTP_VERIFY", "RECOVERY_CODE", "RECOVERY_CODES_SAVE"]), remember: z.boolean(), challengeId: z.string().optional() });
export type PreAuthSession = z.infer<typeof schema>;

function secret() {
  const raw = process.env.AUTH_SECRET ?? process.env.AUTH_SESSION_SECRET;
  if (!raw || raw.trim().length < 32) throw new Error("AUTH_SECRET deve existir e ter pelo menos 32 caracteres.");
  return new TextEncoder().encode(raw);
}
export async function createPreAuthToken(input: { userId: string; access: string; step: Exclude<AuthStep, "LOGIN" | "SUCCESS">; remember: boolean; challengeId?: string }) {
  return new SignJWT({ access: input.access, step: input.step, remember: input.remember, ...(input.challengeId ? { challengeId: input.challengeId } : {}) })
    .setProtectedHeader({ alg: "HS256", typ: "provascan-preauth" }).setSubject(input.userId).setIssuedAt().setExpirationTime("15m").sign(secret());
}
export async function parsePreAuthToken(token: string | undefined): Promise<PreAuthSession | null> {
  if (!token) return null;
  try { return schema.parse((await jwtVerify(token, secret(), { algorithms: ["HS256"] })).payload); } catch { return null; }
}
