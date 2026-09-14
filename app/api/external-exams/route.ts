import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { canManageAcademicExams, isTeacherRole } from "@/lib/collaborative-access";
import { externalTemplateSchema } from "@/lib/universal-exam-validation";
import { hasSameOriginRequest } from "@/lib/request-security";
import { buildRateLimitKey, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { validateSessionToken } from "@/lib/server-session";
import { appendAuditEvent } from "@/services/supabase-data";
import { createExternalExamTemplate, listExternalExamTemplates } from "@/services/external-exams";

export const runtime = "nodejs";

async function authorizedSession() {
  const validation = await validateSessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!validation.ok) return null;
  return isTeacherRole(validation.session.role) || canManageAcademicExams(validation.session.role) ? validation : null;
}

export async function GET() {
  const validation = await authorizedSession();
  if (!validation) return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
  try {
    return NextResponse.json({ templates: await listExternalExamTemplates(validation.session.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os modelos de correção externa." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const validation = await authorizedSession();
  if (!validation) return NextResponse.json({ error: "Seu perfil não pode salvar modelos de correção." }, { status: 403 });
  const limit = await consumeRateLimit({
    bucket: "external-exam-template-create",
    key: buildRateLimitKey(getClientIp(request.headers), validation.session.id),
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.ok) return NextResponse.json({ error: "Muitos modelos foram salvos em sequência. Aguarde e tente novamente." }, { status: 429 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "O conteúdo enviado não é um JSON válido." }, { status: 400 });
  }
  const parsed = externalTemplateSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Revise a estrutura e o gabarito antes de salvar o modelo." }, { status: 400 });
  try {
    const id = await createExternalExamTemplate(validation.session.id, parsed.data);
    await appendAuditEvent({ actorId: validation.session.id, event: "external_exam_template_created", targetId: id, metadata: { questionCount: parsed.data.structure.totalQuestions } });
    return NextResponse.json({ id, message: "Modelo de correção salvo." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar o modelo de correção." }, { status: 503 });
  }
}
