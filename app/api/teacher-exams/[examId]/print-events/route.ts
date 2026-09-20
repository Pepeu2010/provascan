import { NextResponse } from "next/server";
import { z } from "zod";
import { getExamSession } from "@/lib/teacher-exam-session";
import { hasSameOriginRequest } from "@/lib/request-security";
import { appendAuditEvent } from "@/services/supabase-data";
import { getTeacherExam } from "@/services/teacher-exams";

const schema = z.object({ kind: z.enum(["prova", "gabarito", "cartao", "cartoes_individuais", "etiquetas"]) });

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ examId: string }> }) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const session = await getExamSession();
  if (!session) return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dados de impressão inválidos." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Tipo de impressão inválido." }, { status: 400 });
  const { examId } = await context.params;
  try {
    const exam = await getTeacherExam({ actorId: session.id, examId, institutionalView: session.institutionalView });
    if (!exam) return NextResponse.json({ error: "Prova não encontrada." }, { status: 404 });
    await appendAuditEvent({ actorId: session.id, event: `teacher_exam_print_${parsed.data.kind}`, targetId: examId, metadata: { kind: parsed.data.kind } });
    return NextResponse.json({ message: "Impressão registrada." });
  } catch {
    return NextResponse.json({ error: "Não foi possível registrar a impressão." }, { status: 503 });
  }
}
