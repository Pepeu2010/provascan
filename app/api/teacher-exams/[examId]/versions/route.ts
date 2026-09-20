import { NextResponse } from "next/server";
import { getExamSession } from "@/lib/teacher-exam-session";
import { listTeacherExamContentVersions } from "@/services/teacher-exams";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ examId: string }> }) {
  const session = await getExamSession();
  if (!session) return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
  const { examId } = await context.params;
  try {
    const versions = await listTeacherExamContentVersions({ actorId: session.id, examId, institutionalView: session.institutionalView });
    if (!versions) return NextResponse.json({ error: "Prova não encontrada." }, { status: 404 });
    return NextResponse.json({ versions }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível carregar as versões." }, { status: 503 });
  }
}
