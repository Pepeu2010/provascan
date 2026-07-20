import { NextResponse } from "next/server";
import { z } from "zod";
import { applyPreAuthCookie } from "@/lib/auth";
import { requirePreAuth } from "@/lib/auth-flow-server";
import { createPreAuthToken } from "@/lib/pre-auth";
import { hasSameOriginRequest } from "@/lib/request-security";

export const runtime = "nodejs";
const schema = z.object({ method: z.literal("TOTP") });

export async function POST(request: Request) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem da requisição não autorizada." }, { status: 403 });
  const flow = await requirePreAuth();
  if (!flow || flow.preAuth.step !== "MFA_METHOD") return NextResponse.json({ error: "Esta etapa não está disponível." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Método de MFA inválido." }, { status: 400 });
  const step = "TOTP_SETUP";
  const token = await createPreAuthToken({ userId: flow.user.id, access: flow.user.email, remember: flow.preAuth.remember, step });
  const response = NextResponse.json({ step });
  applyPreAuthCookie(response, token);
  return response;
}
