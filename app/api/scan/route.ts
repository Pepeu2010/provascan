import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { hasSameOriginRequest } from "@/lib/request-security";
import { buildRateLimitKey, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { clearInvalidSessionCookie, syncValidatedSessionCookie, validateSessionToken } from "@/lib/server-session";
import { analyzeAnswerSheet } from "@/services/exam-correction";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await hasSameOriginRequest())) {
    return NextResponse.json({ error: "Origem da requisição não autorizada." }, { status: 403 });
  }
  const cookieStore = await cookies();
  const validation = await validateSessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!validation.ok) {
    const response = NextResponse.json(
      { error: "Autenticação necessária." },
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
    const rateLimit = await consumeRateLimit({
      bucket: "scan-analysis",
      key: buildRateLimitKey(getClientIp(new Headers(request.headers)), validation.session.id, validation.session.email),
      limit: 20,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: "Muitas análises seguidas. Aguarde alguns minutos e tente novamente." },
        {
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
          status: 429,
        },
      );
    }

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
      { error: "Falha ao analisar o cartão-resposta." },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 500,
      },
    );
  }
}
