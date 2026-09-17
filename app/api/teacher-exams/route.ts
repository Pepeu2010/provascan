import { NextResponse } from "next/server";
import { teacherExamSaveSchema, validateExamForPublication } from "@/lib/teacher-exam-validation";
import { getExamSession } from "@/lib/teacher-exam-session";
import { hasSameOriginRequest } from "@/lib/request-security";
import { buildRateLimitKey, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { appendAuditEvent } from "@/services/supabase-data";
import { createTeacherExam, listTeacherExams } from "@/services/teacher-exams";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getExamSession();
  if (!session) return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
  const includeArchived = new URL(request.url).searchParams.get("arquivadas") === "1";
  try {
    const exams = await listTeacherExams({ actorId: session.id, includeArchived, institutionalView: session.institutionalView });
    return NextResponse.json({
      capabilities: { canCreateExam: session.canCreateExam },
      exams,
      institutionalView: session.institutionalView,
      viewer: { id: session.id },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar as provas." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const session = await getExamSession();
  if (!session?.canCreateExam) return NextResponse.json({ error: "Seu perfil não pode criar provas." }, { status: 403 });
  const rateLimit = await consumeRateLimit({ bucket: "teacher-exam-create", key: buildRateLimitKey(getClientIp(request.headers), session.id), limit: 20, windowMs: 15 * 60 * 1000 });
  if (!rateLimit.ok) return NextResponse.json({ error: "Muitas criações em sequência. Aguarde e tente novamente." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "O conteúdo enviado não é válido." }, { status: 400 }); }
  const parsed = teacherExamSaveSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Revise os campos e as questões da prova." }, { status: 400 });
  if (parsed.data.intent === "publicar") {
    const errors = validateExamForPublication(parsed.data.exam);
    if (errors.length) return NextResponse.json({ error: errors[0], details: errors }, { status: 400 });
  }
  try {
    const examId = await createTeacherExam({ actorId: session.id, creatorName: session.name, exam: parsed.data.exam, intent: parsed.data.intent });
    await appendAuditEvent({ actorId: session.id, event: parsed.data.intent === "publicar" ? "teacher_exam_published" : "teacher_exam_draft_created", targetId: examId, metadata: { questionCount: parsed.data.exam.questions.length } });
    return NextResponse.json({ examId, message: parsed.data.intent === "publicar" ? "Prova publicada com sucesso." : "Rascunho salvo." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível salvar a prova." }, { status: 400 });
  }
}
