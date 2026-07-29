import { NextResponse } from "next/server";
import { getMfaPolicy, getNextAuthStep, hasConfiguredTotp } from "@/lib/auth-flow";
import { requirePreAuth } from "@/lib/auth-flow-server";

export const runtime = "nodejs";

export async function GET() {
  const result = await requirePreAuth();
  if (!result) return NextResponse.json({ error: "Sua sessão de configuração expirou. Faça login novamente." }, { status: 401 });
  const { user, preAuth } = result;
  const computed = getNextAuthStep(user);
  const setupInProgress = preAuth.step === "TOTP_VERIFY" && Boolean(preAuth.challengeId);
  const step = preAuth.step === "TOTP_SETUP" || setupInProgress || preAuth.step === "RECOVERY_CODES_SAVE" ? preAuth.step : computed;
  return NextResponse.json({ step, mfaConfigured: hasConfiguredTotp(user), user: { nome: user.nome, acesso: user.email }, policy: getMfaPolicy() }, { headers: { "Cache-Control": "no-store" } });
}
