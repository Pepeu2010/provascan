import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, parseSessionToken } from "@/lib/auth";
import { canAccessPath } from "@/lib/access-control";

const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/painel", "/trocar-senha", "/api/dashboard", "/api/scan"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = await parseSessionToken(token);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Autenticacao necessaria." }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!canAccessPath(session.role, pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Acesso negado para este perfil." }, { status: 403 });
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (session.forcePasswordChange && !pathname.startsWith("/trocar-senha")) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Troca de senha obrigatoria." }, { status: 403 });
    }

    return NextResponse.redirect(new URL("/trocar-senha", request.url));
  }

  if (!session.forcePasswordChange && pathname.startsWith("/trocar-senha")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/painel/:path*",
    "/trocar-senha/:path*",
    "/api/dashboard/:path*",
    "/api/scan/:path*",
  ],
};
