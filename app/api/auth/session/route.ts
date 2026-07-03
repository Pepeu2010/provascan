import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { clearInvalidSessionCookie, syncValidatedSessionCookie, validateSessionToken } from "@/lib/server-session";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const validation = await validateSessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!validation.ok) {
    const response = NextResponse.json({ session: null }, { headers: { "Cache-Control": "no-store" } });
    clearInvalidSessionCookie(response);
    return response;
  }

  const response = NextResponse.json({ session: validation.session }, { headers: { "Cache-Control": "no-store" } });
  if (validation.shouldRefreshCookie) {
    await syncValidatedSessionCookie(response, {
      loggedInAt: validation.session.loggedInAt,
      passwordStamp: validation.passwordStamp,
      remember: validation.session.remember,
      user: validation.user,
    });
  }

  return response;
}
