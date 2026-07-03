import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { clearInvalidSessionCookie, syncValidatedSessionCookie, validateSessionToken } from "@/lib/server-session";
import { analyzeAnswerSheet } from "@/services/exam-correction";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const validation = await validateSessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!validation.ok) {
    const response = NextResponse.json(
      { error: "Autenticacao necessaria." },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 401,
      },
    );
    clearInvalidSessionCookie(response);
    return response;
  }

  try {
    const session = await analyzeAnswerSheet();
    const response = NextResponse.json(session, {
      headers: {
        "Cache-Control": "no-store",
      },
    });

    if (validation.shouldRefreshCookie) {
      await syncValidatedSessionCookie(response, {
        loggedInAt: validation.session.loggedInAt,
        passwordStamp: validation.passwordStamp,
        remember: validation.session.remember,
        user: validation.user,
      });
    }

    return response;
  } catch {
    return NextResponse.json(
      { error: "Falha ao analisar o cartao-resposta." },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 500,
      },
    );
  }
}
