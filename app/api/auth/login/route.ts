import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyPreAuthCookie,
} from "@/lib/auth";
import { verifyPassword } from "@/lib/passwords";
import { getMfaPolicy, getNextAuthStep } from "@/lib/auth-flow";
import { createPreAuthToken } from "@/lib/pre-auth";
import { buildRateLimitKey, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  SupabaseConfigError,
  SupabaseConnectionError,
  SupabaseSchemaError,
  getUserByEmail,
  isActiveUser,
  shouldForcePasswordChange,
} from "@/services/supabase-data";

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

    const passwordMatches = await verifyPassword(payload.password, user.senha, user.senha_formato);
    if (!passwordMatches) {
      return invalidCredentialsResponse();
    }

    const policy = getMfaPolicy();
    const step = policy.required ? getNextAuthStep(user) : (shouldForcePasswordChange(user.trocar_senha) ? "PASSWORD_CHANGE" : "MFA_METHOD");
    const token = await createPreAuthToken({ userId: user.id, access: user.email, remember: payload.remember, step });
    const response = NextResponse.json({ message: "Credenciais confirmadas.", redirectTo: "/login", step, user: { nome: user.nome, email: user.email } });
    applyPreAuthCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return invalidCredentialsResponse(400);
    }

    if (error instanceof SupabaseConfigError) {
      return NextResponse.json({ error: "Banco de dados não configurado." }, { status: 500 });
    }

    if (error instanceof SupabaseConnectionError || error instanceof SupabaseSchemaError) {
      return NextResponse.json({ error: "Erro ao acessar o banco de dados." }, { status: 503 });
    }

    return NextResponse.json({ error: "Erro interno ao autenticar." }, { status: 500 });
  }
}
