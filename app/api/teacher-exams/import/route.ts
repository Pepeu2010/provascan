import { NextResponse } from "next/server";
import { getExamSession } from "@/lib/teacher-exam-session";
import { hasSameOriginRequest } from "@/lib/request-security";
import { buildRateLimitKey, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { importTeacherExam } from "@/services/exam-import";
import { appendAuditEvent } from "@/services/supabase-data";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const session = await getExamSession();
  if (!session?.canCreateExam) return NextResponse.json({ error: "Seu perfil não pode importar provas." }, { status: 403 });
  const rateLimit = await consumeRateLimit({ bucket: "teacher-exam-import", key: buildRateLimitKey(getClientIp(request.headers), session.id), limit: 10, windowMs: 30 * 60 * 1000 });
  if (!rateLimit.ok) return NextResponse.json({ error: "Muitas importações em sequência. Aguarde e tente novamente." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "Não foi possível ler o arquivo enviado." }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Selecione um arquivo para importar." }, { status: 400 });
  try {
    const result = await importTeacherExam({ actorId: session.id, creatorName: session.name, file });
    await appendAuditEvent({ actorId: session.id, event: result.duplicate ? "teacher_exam_import_duplicate" : "teacher_exam_imported", targetId: result.exam.id, metadata: { mimeType: result.exam.originalFileMimeType ?? "unknown", size: result.exam.originalFileSize ?? 0 } });
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível importar a prova." }, { status: 400 });
  }
}
