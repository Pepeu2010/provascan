import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE_NAME, createSessionToken, getSessionDuration } from "@/lib/auth";
import { getSheetsStatus, validateCredentials } from "@/services/google-sheets";

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
  console.log("[LOGIN] Request origin:", origin, "host:", host);
  console.log("[LOGIN] GOOGLE_SHEETS_CLIENT_EMAIL:", process.env.GOOGLE_SHEETS_CLIENT_EMAIL ? "configured" : "not set");
  console.log("[LOGIN] GOOGLE_SHEETS_SPREADSHEET_ID:", process.env.GOOGLE_SHEETS_SPREADSHEET_ID ? "configured" : "not set");
  console.log("[LOGIN] GOOGLE_SHEETS_PRIVATE_KEY:", process.env.GOOGLE_SHEETS_PRIVATE_KEY ? "configured" : "not set");
  if (!isSameOrigin(origin, host)) {
    console.log("[LOGIN] Blocked by CORS: origin does not match host");
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
    console.log("[LOGIN] Step 1: parsing request body");
    const rawBody = await request.json();
    console.log("[LOGIN] Step 2: raw body received", typeof rawBody);
    const payload = loginSchema.parse(rawBody);
    console.log("[LOGIN] Step 3: body parsed successfully, email:", payload.email);
    const email = payload.email.trim().toLowerCase();

    // Validate credentials against Google Sheets (if configured)
    console.log("[LOGIN] Step 4: checking sheets status");
    const sheetsStatus = getSheetsStatus();
    console.log("[LOGIN] Step 5: sheets status mode:", sheetsStatus.mode);
    if (sheetsStatus.mode === "google-sheets") {
      console.log("[LOGIN] Step 6: validating credentials against Google Sheets");
      let user: Awaited<ReturnType<typeof validateCredentials>> | null = null;
      try {
        console.log("[LOGIN] Step 6a: calling validateCredentials");
        user = await validateCredentials(email, payload.password);
        console.log("[LOGIN] Step 6b: validateCredentials returned:", user ? "user found" : "user not found");
      } catch (validationError) {
        console.error("[LOGIN] Google Sheets validation threw an error:", validationError);
        if (validationError instanceof Error) {
          console.error("[LOGIN] Error name:", validationError.name);
          console.error("[LOGIN] Error message:", validationError.message);
          console.error("[LOGIN] Error stack:", validationError.stack);
        }
        const nextCount = current && current.resetAt > now ? current.count + 1 : 1;
        attempts.set(clientKey, { count: nextCount, resetAt: now + WINDOW_MS });
        return NextResponse.json(
          { error: "Nao foi possivel conectar ao Google Sheets. Verifique as credenciais e tente novamente." },
          { status: 502 },
        );
      }

      if (!user) {
        const nextCount = current && current.resetAt > now ? current.count + 1 : 1;
        attempts.set(clientKey, { count: nextCount, resetAt: now + WINDOW_MS });
        return NextResponse.json(
          { error: "E-mail ou senha incorretos. Verifique suas credenciais." },
          { status: 401 },
        );
      }
    } else {
      // Google Sheets não está configurado - não podemos validar contra o banco de dados
      const nextCount = current && current.resetAt > now ? current.count + 1 : 1;
      attempts.set(clientKey, { count: nextCount, resetAt: now + WINDOW_MS });
      return NextResponse.json(
        {
          error:
            "A autenticacao via Google Sheets nao esta configurada. Configure as credenciais do Google Sheets para fazer login.",
        },
        { status: 503 },
      );
    }

    const token = await createSessionToken({
      email,
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
        email,
        loggedInAt: new Date().toISOString(),
        remember: payload.remember,
      },
    });
  } catch (error) {
    const nextCount = current && current.resetAt > now ? current.count + 1 : 1;
    attempts.set(clientKey, { count: nextCount, resetAt: now + WINDOW_MS });
    console.error("[LOGIN] Unexpected error during authentication:", error instanceof Error ? error.message : String(error));
    console.error("[LOGIN] Error stack:", error instanceof Error ? error.stack : "No stack available");
    return NextResponse.json({ error: "Nao foi possivel autenticar este acesso." }, { status: 400 });
  }
}