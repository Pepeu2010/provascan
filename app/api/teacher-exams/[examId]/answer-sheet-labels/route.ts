import { NextResponse } from "next/server";
import { z } from "zod";
import { getExamSession } from "@/lib/teacher-exam-session";
import { appendAuditEvent } from "@/services/supabase-data";
import { issueAnswerSheetLabels } from "@/services/answer-sheet-labels";

export const runtime = "nodejs";
const bodySchema = z.object({ studentIds: z.array(z.string().trim().min(1).max(120)).min(1).max(500) }).strict();

export async function POST(request: Request, context: { params: Promise<{ examId: string }> }) {
  const session = await getExamSession();
  if (!session?.canCreateExam) return NextResponse.json({ error: "Seu perfil não pode emitir adesivos." }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Seleção de alunos inválida." }, { status: 400 });
  const { examId } = await context.params;
  try {
    const labels = await issueAnswerSheetLabels({ actorId: session.id, examId, institutionalView: session.institutionalView, studentIds: [...new Set(parsed.data.studentIds)] });
    if (!labels) return NextResponse.json({ error: "Prova não encontrada." }, { status: 404 });
    await appendAuditEvent({ actorId: session.id, event: "answer_sheet_labels_issued", targetId: examId, metadata: { count: labels.length } });
    return NextResponse.json({ labels }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível emitir os adesivos." }, { status: 503 }); }
}
