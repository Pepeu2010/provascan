import { NextResponse } from "next/server";
import { teacherExamActionSchema, teacherExamSaveSchema, validateExamForPublication } from "@/lib/teacher-exam-validation";
import { getExamSession } from "@/lib/teacher-exam-session";
import { hasSameOriginRequest } from "@/lib/request-security";
import { buildRateLimitKey, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { appendAuditEvent } from "@/services/supabase-data";
import { deleteTeacherExam, duplicateTeacherExam, getTeacherExam, setTeacherExamArchived, updateTeacherExam } from "@/services/teacher-exams";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ examId: string }> }) {
  const session = await getExamSession();
  if (!session) return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
  const { examId } = await context.params;
  try {
    const exam = await getTeacherExam({ actorId: session.id, examId, institutionalView: session.institutionalView });
    if (!exam) return NextResponse.json({ error: "Prova não encontrada." }, { status: 404 });
    return NextResponse.json({ exam, readOnly: session.institutionalView }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar a prova." }, { status: 503 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ examId: string }> }) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const session = await getExamSession();
  if (!session || session.role !== "professor") return NextResponse.json({ error: "Somente o professor proprietário pode editar esta prova." }, { status: 403 });
  const rateLimit = await consumeRateLimit({ bucket: "teacher-exam-save", key: buildRateLimitKey(getClientIp(request.headers), session.id), limit: 60, windowMs: 10 * 60 * 1000 });
  if (!rateLimit.ok) return NextResponse.json({ error: "Muitos salvamentos em sequência. Aguarde alguns instantes." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "O conteúdo enviado não é válido." }, { status: 400 }); }
  const parsed = teacherExamSaveSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Revise os campos e as questões da prova." }, { status: 400 });
  if (parsed.data.intent === "publicar") {
    const errors = validateExamForPublication(parsed.data.exam);
    if (errors.length) return NextResponse.json({ error: errors[0], details: errors }, { status: 400 });
  }
  const { examId } = await context.params;
  try {
    const version = await updateTeacherExam({ actorId: session.id, examId, exam: parsed.data.exam, expectedVersion: parsed.data.expectedVersion, intent: parsed.data.intent });
    await appendAuditEvent({ actorId: session.id, event: parsed.data.intent === "publicar" ? "teacher_exam_published" : "teacher_exam_draft_saved", targetId: examId, metadata: { version } });
    return NextResponse.json({ message: parsed.data.intent === "publicar" ? "Prova publicada com sucesso." : "Rascunho salvo.", version });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível salvar a prova.";
    return NextResponse.json({ error: message }, { status: message.includes("outra sessão") ? 409 : message.includes("não pertence") ? 404 : 400 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ examId: string }> }) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const session = await getExamSession();
  if (!session || session.role !== "professor") return NextResponse.json({ error: "Somente o professor proprietário pode alterar esta prova." }, { status: 403 });
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "A ação enviada não é válida." }, { status: 400 }); }
  const parsed = teacherExamActionSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 });
  const { examId } = await context.params;
  try {
    let resultId = examId;
    if (parsed.data.action === "duplicar") resultId = await duplicateTeacherExam(session.id, session.name, examId);
    else if (parsed.data.action === "excluir") await deleteTeacherExam(session.id, examId);
    else await setTeacherExamArchived(session.id, examId, parsed.data.action === "arquivar");
    await appendAuditEvent({ actorId: session.id, event: `teacher_exam_${parsed.data.action}`, targetId: resultId });
    const message = parsed.data.action === "duplicar" ? "Prova duplicada como rascunho." : parsed.data.action === "arquivar" ? "Prova arquivada." : parsed.data.action === "restaurar" ? "Prova restaurada como rascunho." : "Prova excluída.";
    return NextResponse.json({ examId: resultId, message });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível concluir a ação." }, { status: 400 });
  }
}
