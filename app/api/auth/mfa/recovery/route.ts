import { NextResponse } from "next/server";
import { z } from "zod";
import { createFinalSession, requirePreAuth } from "@/lib/auth-flow-server";
import { consumeRecoveryCode, appendAuditEvent, updateLastMfa } from "@/services/google-sheets";
import { hasSameOriginRequest } from "@/lib/request-security";
import { buildRateLimitKey, consumeRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
const schema = z.object({ code: z.string().transform((value) => value.toUpperCase().replace(/[^A-Z0-9]/g, "")).refine((value) => value.length === 8) });

export async function POST(request: Request) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem da requisição não autorizada." }, { status: 403 });
  const flow = await requirePreAuth(); if (!flow) return NextResponse.json({ error: "Sua sessão de configuração expirou. Faça login novamente." }, { status: 401 });
  const rate = await consumeRateLimit({ bucket: "mfa-recovery", key: buildRateLimitKey(getClientIp(request.headers), flow.user.id), limit: 5, windowMs: 15 * 60 * 1000 });
  if (!rate.ok) return NextResponse.json({ error: "Muitas tentativas. Aguarde antes de tentar novamente." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Informe um código de recuperação válido." }, { status: 400 });
  const code = `${parsed.data.code.slice(0, 4)}-${parsed.data.code.slice(4)}`;
  if (!(await consumeRecoveryCode(flow.user.id, code))) return NextResponse.json({ error: "Código inválido ou já utilizado." }, { status: 400 });
  await updateLastMfa(flow.user.id); await appendAuditEvent({ actorId: flow.user.id, event: "MFA_RECOVERY_CODE_USED", targetId: flow.user.id });
  const response = NextResponse.json({ message: "Identidade confirmada.", redirectTo: "/dashboard" }); await createFinalSession(response, flow); return response;
}
