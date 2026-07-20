import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { applyPreAuthCookie } from "@/lib/auth";
import { createPreAuthToken } from "@/lib/pre-auth";
import { hashPassword, validateNewPassword, verifyPassword } from "@/lib/passwords";
import { buildRateLimitKey, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { requirePreAuth } from "@/lib/auth-flow-server";
import {
  GoogleSheetsConnectionError,
  GoogleSheetsSchemaError,
  updateUserPassword,
} from "@/services/google-sheets";

export const runtime = "nodejs";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(256),
    newPassword: z.string().min(8).max(256),
    confirmPassword: z.string().min(8).max(256),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "A confirmação da senha não confere.",
    path: ["confirmPassword"],
  });

function isSameOrigin(originHeader: string | null, hostHeader: string | null) {
  if (!originHeader || !hostHeader) {
    return false;
  }

  try {
    const origin = new URL(originHeader);
    return origin.host === hostHeader;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const headersList = await headers();
  const origin = headersList.get("origin");
  const host = headersList.get("host");

  if (!isSameOrigin(origin, host)) {
    return NextResponse.json({ error: "Origem da requisição não autorizada." }, { status: 403 });
  }

  const validation = await requirePreAuth();
  if (!validation || validation.preAuth.step !== "PASSWORD_CHANGE") return NextResponse.json({ error: "Sua sessão de configuração expirou. Faça login novamente." }, { status: 401 });

  try {
    const payload = changePasswordSchema.parse(await request.json());
    const rateLimit = await consumeRateLimit({
      bucket: "auth-password-change",
      key: buildRateLimitKey(getClientIp(headersList), validation.user.id, validation.user.email),
      limit: 6,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: "Muitas tentativas de alteração de senha. Aguarde alguns minutos e tente novamente." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const user = validation.user;

    const currentPasswordMatches = await verifyPassword(payload.currentPassword, user.senha, user.senha_formato);
    if (!currentPasswordMatches) {
      return NextResponse.json({ error: "Nome ou senha inválidos." }, { status: 401 });
    }

    const passwordError = validateNewPassword(payload.newPassword, user.email);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
    const nextStoredPassword = await hashPassword(payload.newPassword);
    await updateUserPassword(user.id, nextStoredPassword, { clearPasswordChangeFlag: true });
    const step = "MFA_METHOD";
    const token = await createPreAuthToken({ userId: user.id, access: user.email, remember: validation.preAuth.remember, step });
    const response = NextResponse.json({ message: "Senha alterada com segurança.", step });
    applyPreAuthCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }

    if (error instanceof GoogleSheetsConnectionError || error instanceof GoogleSheetsSchemaError) {
      return NextResponse.json({ error: "Erro ao conectar com a planilha." }, { status: 503 });
    }

    return NextResponse.json({ error: "Erro interno ao alterar senha." }, { status: 500 });
  }
}
