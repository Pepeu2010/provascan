import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyAuthCookie,
  buildSessionUser,
  createSessionToken,
} from "@/lib/auth";
import { createPasswordStamp, verifyPassword } from "@/lib/passwords";
import { buildRateLimitKey, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  GoogleSheetsConfigError,
  GoogleSheetsConnectionError,
  GoogleSheetsSchemaError,
  getUserByEmail,
  isActiveUser,
  shouldForcePasswordChange,
} from "@/services/google-sheets";
import { normalizeSubject } from "@/lib/subject-scope";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().trim().min(1).max(256),
  password: z.string().min(1).max(256),
  remember: z.boolean().optional().default(false),
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

function invalidCredentialsResponse(status = 401) {
  return NextResponse.json({ error: "Nome ou senha inválidos." }, { status });
}

export async function POST(request: Request) {
  const headersList = await headers();
  const origin = headersList.get("origin");
  const host = headersList.get("host");

  if (!isSameOrigin(origin, host)) {
    return NextResponse.json({ error: "Origem da requisição não autorizada." }, { status: 403 });
  }

  try {
    const payload = loginSchema.parse(await request.json());
    const rateLimit = await consumeRateLimit({
      bucket: "auth-login",
      key: buildRateLimitKey(getClientIp(headersList), payload.email),
      limit: 8,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const user = await getUserByEmail(payload.email);

    if (!user) {
      return invalidCredentialsResponse();
    }

    if (!isActiveUser(user.ativo)) {
      return NextResponse.json({ error: "Usuário inativo." }, { status: 403 });
    }

    const passwordMatches = await verifyPassword(payload.password, user.senha);
    if (!passwordMatches) {
      return invalidCredentialsResponse();
    }

    const storedPassword = user.senha;

    const loggedInAt = new Date().toISOString();
    const safeUser = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.perfil,
      subject: normalizeSubject(user.disciplina),
      forcePasswordChange: shouldForcePasswordChange(user.trocar_senha),
    };

    const token = await createSessionToken({
      user: safeUser,
      remember: payload.remember,
      loggedInAt,
      passwordStamp: createPasswordStamp(storedPassword),
    });

    const response = NextResponse.json({
      message: "Login realizado com sucesso.",
      redirectTo: safeUser.forcePasswordChange ? "/trocar-senha" : "/dashboard",
      user: buildSessionUser(safeUser, payload.remember, loggedInAt),
    });
    applyAuthCookie(response, token, payload.remember);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return invalidCredentialsResponse(400);
    }

    if (error instanceof GoogleSheetsConfigError) {
      return NextResponse.json({ error: "Erro ao conectar com a planilha." }, { status: 500 });
    }

    if (error instanceof GoogleSheetsConnectionError || error instanceof GoogleSheetsSchemaError) {
      return NextResponse.json({ error: "Erro ao conectar com a planilha." }, { status: 503 });
    }

    return NextResponse.json({ error: "Erro interno ao autenticar." }, { status: 500 });
  }
}
