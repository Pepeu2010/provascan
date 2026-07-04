import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { canAccessPath } from "@/lib/access-control";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { validateSessionToken } from "@/lib/server-session";

export async function requireProtectedPage(pathname: string) {
  const cookieStore = await cookies();
  const validation = await validateSessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!validation.ok) {
    redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
  }

  if (!canAccessPath(validation.session.role, pathname)) {
    redirect("/dashboard");
  }

  if (validation.session.forcePasswordChange && !pathname.startsWith("/trocar-senha")) {
    redirect("/trocar-senha");
  }

  if (!validation.session.forcePasswordChange && pathname.startsWith("/trocar-senha")) {
    redirect("/dashboard");
  }

  return validation.session;
}
