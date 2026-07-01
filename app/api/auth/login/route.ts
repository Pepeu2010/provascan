import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE_NAME, createSessionToken, getSessionDuration } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().trim().email(),
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
    const token = await createSessionToken({
      email: payload.email,
      remember: payload.remember,
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
      message: "Sessao segura iniciada no navegador.",
      session: {
        email: payload.email.trim().toLowerCase(),
        loggedInAt: new Date().toISOString(),
        remember: payload.remember,
      },
    });
  } catch {
    const nextCount = current && current.resetAt > now ? current.count + 1 : 1;
    attempts.set(clientKey, { count: nextCount, resetAt: now + WINDOW_MS });
    return NextResponse.json({ error: "Nao foi possivel autenticar este acesso." }, { status: 400 });
  }
}
