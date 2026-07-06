import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { canManageAllSubjects, filterAppDataForSubject, mergeScopedAppData, requireScopedSubject } from "@/lib/subject-scope";
import { clearInvalidSessionCookie, syncValidatedSessionCookie, validateSessionToken } from "@/lib/server-session";
import {
  getOperationalAppData,
  GoogleSheetsConfigError,
  GoogleSheetsConnectionError,
  GoogleSheetsSchemaError,
  saveOperationalAppData,
} from "@/services/google-sheets";
import type { AppDataState } from "@/lib/app-data";

export const runtime = "nodejs";

function isAppDataStatePayload(value: unknown): value is AppDataState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AppDataState>;
  return (
    Array.isArray(candidate.answerKeys) &&
    Array.isArray(candidate.classes) &&
    Array.isArray(candidate.correctionRules) &&
    Array.isArray(candidate.corrections) &&
    Array.isArray(candidate.exams) &&
    Array.isArray(candidate.students) &&
    Boolean(candidate.teacherProfile && typeof candidate.teacherProfile === "object")
  );
}

async function validateRequestSession() {
  const cookieStore = await cookies();
  return validateSessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

function buildAuthErrorResponse() {
  return NextResponse.json(
    { error: "Autenticação necessária." },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  const validation = await validateRequestSession();

  if (!validation.ok) {
    const response = buildAuthErrorResponse();
    clearInvalidSessionCookie(response);
    return response;
  }

  try {
    const data = await getOperationalAppData();
    const subject = requireScopedSubject(validation.session);
    if (!canManageAllSubjects(validation.session.role) && !subject) {
      return NextResponse.json({ error: "Usuário sem disciplina vinculada na aba usuários." }, { status: 403 });
    }
    const filteredData = filterAppDataForSubject(data, subject);
    const finalResponse = NextResponse.json(filteredData, {
      headers: { "Cache-Control": "no-store" },
    });

    if (validation.shouldRefreshCookie) {
      await syncValidatedSessionCookie(finalResponse, {
        loggedInAt: validation.session.loggedInAt,
        passwordStamp: validation.passwordStamp,
        remember: validation.session.remember,
        user: validation.user,
      });
    }

    return finalResponse;
  } catch (error) {
    if (error instanceof GoogleSheetsConfigError) {
      return NextResponse.json({ error: "Planilha não configurada." }, { status: 500 });
    }

    if (error instanceof GoogleSheetsConnectionError || error instanceof GoogleSheetsSchemaError) {
      return NextResponse.json({ error: "Erro ao carregar dados operacionais da planilha." }, { status: 503 });
    }

    return NextResponse.json({ error: "Erro interno ao carregar os dados operacionais." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const validation = await validateRequestSession();

  if (!validation.ok) {
    const response = buildAuthErrorResponse();
    clearInvalidSessionCookie(response);
    return response;
  }

  try {
    const payload = (await request.json()) as { data?: unknown };
    if (!isAppDataStatePayload(payload.data)) {
      return NextResponse.json({ error: "Payload inválido para persistência." }, { status: 400 });
    }

    const subject = requireScopedSubject(validation.session);
    if (!canManageAllSubjects(validation.session.role) && !subject) {
      return NextResponse.json({ error: "Usuário sem disciplina vinculada na aba usuários." }, { status: 403 });
    }

    const currentData = await getOperationalAppData();
    const nextData = mergeScopedAppData(currentData, payload.data, subject);
    await saveOperationalAppData(nextData);

    const response = NextResponse.json(
      { message: "Dados operacionais salvos com sucesso." },
      { headers: { "Cache-Control": "no-store" } },
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
  } catch (error) {
    if (error instanceof GoogleSheetsConfigError) {
      return NextResponse.json({ error: "Planilha não configurada." }, { status: 500 });
    }

    if (error instanceof GoogleSheetsConnectionError || error instanceof GoogleSheetsSchemaError) {
      return NextResponse.json({ error: "Erro ao salvar dados operacionais na planilha." }, { status: 503 });
    }

    return NextResponse.json({ error: "Erro interno ao salvar os dados operacionais." }, { status: 500 });
  }
}
