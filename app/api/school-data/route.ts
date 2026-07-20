import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { canManageAllSubjects } from "@/lib/subject-scope";
import { clearInvalidSessionCookie, syncValidatedSessionCookie, validateSessionToken } from "@/lib/server-session";
import {
  GoogleSheetsConfigError,
  GoogleSheetsConnectionError,
  GoogleSheetsSchemaError,
  getSchoolRoster,
} from "@/services/google-sheets";

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

  if (!canManageAllSubjects(validation.session.role)) {
    return NextResponse.json(
      { error: "A lista escolar completa é restrita a perfis de gestão." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const roster = await getSchoolRoster();
    const response = NextResponse.json(roster, {
      headers: { "Cache-Control": "no-store" },
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
  } catch (error) {
    if (error instanceof GoogleSheetsConfigError) {
      return NextResponse.json({ error: "Planilha não configurada." }, { status: 500 });
    }

    if (error instanceof GoogleSheetsConnectionError || error instanceof GoogleSheetsSchemaError) {
      return NextResponse.json({ error: "Erro ao carregar alunos e turmas da planilha." }, { status: 503 });
    }

    return NextResponse.json({ error: "Erro interno ao carregar dados escolares." }, { status: 500 });
  }
}
