import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { canManageAcademicExams, isTeacherRole } from "@/lib/collaborative-access";
import { getStudentsForExam } from "@/lib/exam-audience";
import { hasSameOriginRequest } from "@/lib/request-security";
import { buildRateLimitKey, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { validateSessionToken } from "@/lib/server-session";
import { buildCorrectionSession } from "@/services/exam-correction";
import {
  appendAuditEvent,
  getOperationalAppData,
  saveCorrectionSession,
  teacherCanCorrectExam,
} from "@/services/supabase-data";

const schema = z.object({
  answers: z.array(z.object({
    marcacoes: z.array(z.string().trim().min(1).max(30)).max(10),
    questao: z.number().int().min(1).max(200),
  }).strict()).min(1).max(200),
  confidence: z.number().finite().min(0).max(100),
  examId: z.string().trim().min(1).max(120),
  imageLabel: z.string().trim().min(1).max(260),
  method: z.enum(["qr", "ocr", "manual"]),
  notes: z.array(z.string().trim().max(500)).max(40),
  studentId: z.string().trim().min(1).max(120),
}).strict();

export async function POST(request: Request) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const validation = await validateSessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!validation.ok) return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
  if (!isTeacherRole(validation.session.role) && !canManageAcademicExams(validation.session.role)) {
    return NextResponse.json({ error: "Seu perfil não pode salvar correções." }, { status: 403 });
  }

  const limit = await consumeRateLimit({
    bucket: "correction-create",
    key: buildRateLimitKey(getClientIp(request.headers), validation.session.id),
    limit: 40,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.ok) return NextResponse.json({ error: "Muitas correções em sequência. Aguarde antes de tentar novamente." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

  try {
    const input = schema.parse(await request.json());
    if (isTeacherRole(validation.session.role) && !(await teacherCanCorrectExam(validation.session.id, input.examId))) {
      return NextResponse.json({ error: "Esta prova não está liberada ou não foi atribuída a você." }, { status: 403 });
    }

    const data = await getOperationalAppData();
    const exam = data.exams.find((item) => item.id === input.examId);
    if (!exam || !exam.releasedAt) return NextResponse.json({ error: "A prova precisa estar liberada antes da correção." }, { status: 400 });
    const student = data.students.find((item) => item.id === input.studentId);
    if (!student || !getStudentsForExam(exam, data.students, data.classes).some((item) => item.id === student.id)) {
      return NextResponse.json({ error: "O aluno selecionado não pertence ao público desta prova." }, { status: 400 });
    }
    const answerKey = data.answerKeys.filter((item) => item.provaId === exam.id).sort((a, b) => a.questao - b.questao);
    if (!answerKey.length) return NextResponse.json({ error: "Esta prova ainda não possui gabarito completo." }, { status: 400 });
    if (input.answers.length !== answerKey.length) return NextResponse.json({ error: "Revise todas as questões antes de salvar." }, { status: 400 });

    const session = buildCorrectionSession({
      answerKey,
      answers: input.answers,
      classes: data.classes,
      confidence: input.confidence,
      exams: data.exams,
      imageLabel: input.imageLabel,
      method: input.method,
      notes: input.notes,
      rules: data.correctionRules,
      student,
    });
    await saveCorrectionSession(session);
    await appendAuditEvent({
      actorId: validation.session.id,
      event: "correction_created",
      targetId: session.correction.id,
      metadata: { examId: exam.id, role: validation.session.role },
    });
    return NextResponse.json({ correction: session, message: "Correção salva com sucesso." }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Revise os dados desta correção." }, { status: 400 });
    return NextResponse.json({ error: "Não foi possível salvar esta correção." }, { status: 500 });
  }
}
