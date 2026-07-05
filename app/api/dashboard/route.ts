import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { calculateAnalytics } from "@/lib/app-data";
import { canManageAllSubjects, filterAppDataForSubject, requireScopedSubject } from "@/lib/subject-scope";
import { clearInvalidSessionCookie, syncValidatedSessionCookie, validateSessionToken } from "@/lib/server-session";
import { getOperationalAppData, getSystemSnapshot } from "@/services/google-sheets";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const validation = await validateSessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!validation.ok) {
    const response = NextResponse.json(
      { error: "Autenticação necessária." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
    clearInvalidSessionCookie(response);
    return response;
  }

  try {
    const [snapshot, data] = await Promise.all([getSystemSnapshot(), getOperationalAppData()]);
    const subject = requireScopedSubject(validation.session);
    if (!canManageAllSubjects(validation.session.role) && !subject) {
      return NextResponse.json({ error: "Usuario sem disciplina vinculada na aba usuarios." }, { status: 403 });
    }
    const scopedData = filterAppDataForSubject(data, subject);
    const analytics = calculateAnalytics(scopedData);
    const response = NextResponse.json(
      {
        metrics: analytics.dashboardMetrics,
        latestCorrection: scopedData.corrections[0] ?? null,
        storage: snapshot,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );

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
      { error: "Não foi possível carregar o resumo operacional." },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 500,
      },
    );
  }
}
