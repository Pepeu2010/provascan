import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AUTH_COOKIE_NAME,
  buildSessionUser,
  createSessionToken,
  getSessionDuration,
} from "@/lib/auth";
import { verifyPassword } from "@/lib/passwords";
import {
  GoogleSheetsConfigError,
  GoogleSheetsConnectionError,
  GoogleSheetsSchemaError,
  getUserByEmail,
  isActiveUser,
  shouldForcePasswordChange,
} from "@/services/google-sheets";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().trim().min(1).max(256),
  password: z.string().min(1).max(256),
  remember: z.boolean().optional().default(false),
});

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

function getClientKey(forwardedFor: string | null) {
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

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
  return NextResponse.json({ error: "Nome ou senha invalidos." }, { status });
}

export async function POST(request: Request) {
  const headersList = await headers();
  const origin = headersList.get("origin");
  const host = headersList.get("host");

  if (!isSameOrigin(origin, host)) {
    return NextResponse.json({ error: "Origem da requisicao nao autorizada." }, { status: 403 });
  }

  const clientKey = getClientKey(headersList.get("x-forwarded-for"));
  const current = attempts.get(clientKey);
  const now = Date.now();

  if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente." },
      { status: 429 },
    );
  }

  try {
    const payload = loginSchema.parse(await request.json());
    const user = await getUserByEmail(payload.email);

    if (!user) {
      const nextCount = current && current.resetAt > now ? current.count + 1 : 1;
      attempts.set(clientKey, { count: nextCount, resetAt: now + WINDOW_MS });
      return invalidCredentialsResponse();
    }

    if (!isActiveUser(user.ativo)) {
      return NextResponse.json({ error: "Usuario inativo." }, { status: 403 });
    }

    const passwordMatches = await verifyPassword(payload.password, user.senha);
    if (!passwordMatches) {
      const nextCount = current && current.resetAt > now ? current.count + 1 : 1;
      attempts.set(clientKey, { count: nextCount, resetAt: now + WINDOW_MS });
      return invalidCredentialsResponse();
    }

    const loggedInAt = new Date().toISOString();
    const safeUser = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.perfil,
      forcePasswordChange: shouldForcePasswordChange(user.trocar_senha),
    };

    const token = await createSessionToken({
      user: safeUser,
      remember: payload.remember,
      loggedInAt,
    });

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      maxAge: getSessionDuration(payload.remember),
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    attempts.delete(clientKey);

    return NextResponse.json({
      message: "Login realizado com sucesso.",
      redirectTo: safeUser.forcePasswordChange ? "/trocar-senha" : "/dashboard",
      user: buildSessionUser(safeUser, payload.remember, loggedInAt),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const nextCount = current && current.resetAt > now ? current.count + 1 : 1;
      attempts.set(clientKey, { count: nextCount, resetAt: now + WINDOW_MS });
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
