import { NextResponse } from "next/server";
import { getExamSession } from "@/lib/teacher-exam-session";
import { getTeacherExam } from "@/services/teacher-exams";
import { listExamAudit } from "@/services/exam-audit";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ examId: string }> }) {
  const session = await getExamSession();
  if (!session) return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
  const { examId } = await context.params;
  const exam = await getTeacherExam({ actorId: session.id, examId, institutionalView: session.institutionalView });
  if (!exam) return NextResponse.json({ error: "Prova não encontrada." }, { status: 404 });
  try { return NextResponse.json({ events: await listExamAudit(examId) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível carregar a auditoria." }, { status: 503 }); }
}
