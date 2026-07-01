import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, parseSessionToken } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const session = await parseSessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json({ session: null }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    {
      session: {
        email: session.email,
        loggedInAt: new Date(session.iat * 1000).toISOString(),
        remember: session.remember,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
