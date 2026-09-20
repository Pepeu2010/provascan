import { NextResponse } from "next/server";
import { z } from "zod";
import { getExamSession } from "@/lib/teacher-exam-session";
import { hasSameOriginRequest } from "@/lib/request-security";
import { buildRateLimitKey, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { appendAuditEvent } from "@/services/supabase-data";
import { restoreTeacherExamContentVersion } from "@/services/teacher-exams";

const restoreSchema = z.object({ expectedVersion: z.number().int().min(1).nullable().optional() }).strict();

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ examId: string; versionId: string }> }) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const session = await getExamSession();
  if (!session?.canCreateExam) return NextResponse.json({ error: "Seu perfil não pode restaurar versões de provas." }, { status: 403 });
  const rateLimit = await consumeRateLimit({ bucket: "teacher-exam-restore", key: buildRateLimitKey(getClientIp(request.headers), session.id), limit: 12, windowMs: 15 * 60 * 1000 });
  if (!rateLimit.ok) return NextResponse.json({ error: "Muitas restaurações em sequência. Aguarde e tente novamente." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "O conteúdo enviado não é válido." }, { status: 400 }); }
  const parsed = restoreSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Não foi possível confirmar a versão atual da prova." }, { status: 400 });
  const { examId, versionId } = await context.params;
  try {
    const version = await restoreTeacherExamContentVersion({ actorId: session.id, examId, expectedVersion: parsed.data.expectedVersion, versionId });
    await appendAuditEvent({ actorId: session.id, event: "teacher_exam_content_restored", targetId: examId, metadata: { restoredFrom: versionId, version } });
    return NextResponse.json({ message: "Conteúdo restaurado. A aplicação atual foi preservada.", version });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível restaurar esta versão.";
    return NextResponse.json({ error: message }, { status: message.includes("outra sessão") ? 409 : message.includes("não pertence") || message.includes("não encontrada") ? 404 : 400 });
  }
}
