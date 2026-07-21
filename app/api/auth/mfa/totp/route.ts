import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { applyPreAuthCookie } from "@/lib/auth";
import { createFinalSession, requirePreAuth } from "@/lib/auth-flow-server";
import { createChallenge, getChallenge } from "@/lib/mfa-challenge-store";
import { encryptTotpSecret } from "@/lib/mfa-crypto";
import { decryptTotpSecret } from "@/lib/mfa-crypto";
import { createPreAuthToken } from "@/lib/pre-auth";
import { createRecoveryCodes, createTotpSetup, verifyTotp } from "@/lib/totp";
import { appendAuditEvent, completeTotpSetup, updateLastMfa } from "@/services/supabase-data";
import { hasSameOriginRequest } from "@/lib/request-security";
import { buildRateLimitKey, consumeRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
const schema = z.discriminatedUnion("action", [z.object({ action: z.literal("begin") }), z.object({ action: z.literal("verify"), code: z.string().regex(/^\d{6}$/) }), z.object({ action: z.literal("confirm-recovery") })]);

export async function POST(request: Request) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem da requisição não autorizada." }, { status: 403 });
  const flow = await requirePreAuth(); if (!flow) return NextResponse.json({ error: "Sua sessão de configuração expirou. Faça login novamente." }, { status: 401 });
  try {
    const payload = schema.parse(await request.json());
    if (payload.action === "verify") {
      const rate = await consumeRateLimit({ bucket: "mfa-totp-verify", key: buildRateLimitKey(getClientIp(request.headers), flow.user.id), limit: 5, windowMs: 5 * 60 * 1000 });
      if (!rate.ok) return NextResponse.json({ error: "Muitas tentativas. Aguarde antes de tentar novamente." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
    }
    if (payload.action === "begin") {
      if (flow.preAuth.step !== "MFA_METHOD" && flow.preAuth.step !== "TOTP_SETUP") return NextResponse.json({ error: "Esta etapa não está disponível." }, { status: 403 });
      const setup = createTotpSetup(flow.user.email); const challenge = await createChallenge({ userId: flow.user.id, kind: "TOTP_SETUP", secret: setup.secret });
      const token = await createPreAuthToken({ userId: flow.user.id, access: flow.user.email, remember: flow.preAuth.remember, step: "TOTP_VERIFY", challengeId: challenge.id });
      const response = NextResponse.json({ step: "TOTP_VERIFY", otpauthUri: setup.otpauthUri, manualKey: setup.secret }); applyPreAuthCookie(response, token); return response;
    }
    if (payload.action === "verify") {
      if (flow.preAuth.step !== "TOTP_VERIFY") return NextResponse.json({ error: "Esta etapa não está disponível." }, { status: 403 });
      if (!flow.preAuth.challengeId) {
        if (!flow.user.mfa_secret_encrypted || !verifyTotp(decryptTotpSecret(flow.user.mfa_secret_encrypted), payload.code)) return NextResponse.json({ error: "Código inválido ou expirado." }, { status: 400 });
        await updateLastMfa(flow.user.id); await appendAuditEvent({ actorId: flow.user.id, event: "MFA_TOTP_VERIFIED", targetId: flow.user.id });
        const response = NextResponse.json({ message: "Identidade confirmada.", redirectTo: "/dashboard" }); await createFinalSession(response, flow); return response;
      }
      const challenge = await getChallenge(flow.preAuth.challengeId, flow.user.id, "TOTP_SETUP");
      if (!challenge?.secret || !verifyTotp(challenge.secret, payload.code)) return NextResponse.json({ error: "Código inválido ou expirado." }, { status: 400 });
      const recoveryCodes = createRecoveryCodes(); const recoveryCodeHashes = JSON.stringify(await Promise.all(recoveryCodes.map((item) => hash(item, 12))));
      await completeTotpSetup(flow.user.id, { encryptedSecret: encryptTotpSecret(challenge.secret), recoveryCodeHashes });
      await appendAuditEvent({ actorId: flow.user.id, event: "MFA_TOTP_ENABLED", targetId: flow.user.id });
      const token = await createPreAuthToken({ userId: flow.user.id, access: flow.user.email, remember: flow.preAuth.remember, step: "RECOVERY_CODES_SAVE", challengeId: flow.preAuth.challengeId });
      const response = NextResponse.json({ step: "RECOVERY_CODES_SAVE", recoveryCodes }); applyPreAuthCookie(response, token); return response;
    }
    if (flow.preAuth.step !== "RECOVERY_CODES_SAVE") return NextResponse.json({ error: "Confirme o salvamento dos códigos antes de continuar." }, { status: 403 });
    await updateLastMfa(flow.user.id); const response = NextResponse.json({ message: "Conta protegida.", redirectTo: "/dashboard" }); await createFinalSession(response, flow); return response;
  } catch (error) { if (error instanceof z.ZodError) return NextResponse.json({ error: "Código inválido." }, { status: 400 }); return NextResponse.json({ error: "Não foi possível configurar o autenticador." }, { status: 503 }); }
}
