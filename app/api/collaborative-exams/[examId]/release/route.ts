import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { canManageAcademicExams } from "@/lib/collaborative-access";
import { hasSameOriginRequest } from "@/lib/request-security";
import { buildRateLimitKey, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { validateSessionToken } from "@/lib/server-session";
import { appendAuditEvent } from "@/services/supabase-data";
import { releaseExam } from "@/services/collaborative-exams";
export async function POST(request: Request, { params }: { params: Promise<{ examId: string }> }) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const validation = await validateSessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!validation.ok || !canManageAcademicExams(validation.session.role)) return NextResponse.json({ error: "Acesso restrito à gestão acadêmica." }, { status: 403 });
  const rateLimit = await consumeRateLimit({ bucket: "collaborative-exam-release", key: buildRateLimitKey(getClientIp(request.headers), validation.session.id), limit: 10, windowMs: 15 * 60 * 1000 });
  if (!rateLimit.ok) return NextResponse.json({ error: "Muitas tentativas de liberação. Aguarde antes de tentar novamente." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rateLimit.retryAfterSeconds) } });
  const { examId } = await params;
  try { await releaseExam(examId); await appendAuditEvent({ actorId: validation.session.id, event: "collaborative_exam_released", targetId: examId }); return NextResponse.json({ message: "Prova liberada." }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível liberar." }, { status: 400 }); }
}
