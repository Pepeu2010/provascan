import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, parseSessionToken } from "@/lib/auth";
import {
  GoogleSheetsConfigError,
  GoogleSheetsConnectionError,
  GoogleSheetsSchemaError,
  getSchoolRoster,
} from "@/services/google-sheets";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const session = await parseSessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json(
      { error: "Autenticação necessária." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const roster = await getSchoolRoster();

    return NextResponse.json(roster, {
      headers: { "Cache-Control": "no-store" },
    });
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
