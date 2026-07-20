import { NextResponse } from "next/server";
import { getMfaPolicy, getNextAuthStep } from "@/lib/auth-flow";
import { requirePreAuth } from "@/lib/auth-flow-server";

export const runtime = "nodejs";

export async function GET() {
  const result = await requirePreAuth();
  if (!result) return NextResponse.json({ error: "Sua sessão de configuração expirou. Faça login novamente." }, { status: 401 });
  const { user, preAuth } = result;
  const computed = getNextAuthStep(user);
  const step = preAuth.step === "TOTP_SETUP" || preAuth.step === "TOTP_VERIFY" || preAuth.step === "RECOVERY_CODES_SAVE" ? preAuth.step : computed;
  return NextResponse.json({ step, user: { nome: user.nome, acesso: user.email }, policy: getMfaPolicy() }, { headers: { "Cache-Control": "no-store" } });
}
