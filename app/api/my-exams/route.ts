import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { isTeacherRole } from "@/lib/collaborative-access";
import { validateSessionToken } from "@/lib/server-session";
import { listCollaborativeExams } from "@/services/collaborative-exams";

export async function GET() {
  const store = await cookies();
  const validation = await validateSessionToken(store.get(AUTH_COOKIE_NAME)?.value);
  if (!validation.ok || !isTeacherRole(validation.session.role)) return NextResponse.json({ error: "Acesso restrito a professores." }, { status: 403 });
  try { return NextResponse.json({ exams: await listCollaborativeExams(validation.session.id) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Não foi possível carregar suas provas." }, { status: 503 }); }
}
