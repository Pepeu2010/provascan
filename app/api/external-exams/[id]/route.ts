import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { isAcademicManagementRole } from "@/lib/access-control";
import { externalTemplateActionSchema } from "@/lib/universal-exam-validation";
import { hasSameOriginRequest } from "@/lib/request-security";
import { validateSessionToken } from "@/lib/server-session";
import { appendAuditEvent } from "@/services/supabase-data";
import { createExternalExamTemplate, getExternalExamTemplate, updateExternalExamTemplate } from "@/services/external-exams";

export const runtime = "nodejs";

async function authorizedSession() {
  const validation = await validateSessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!validation.ok) return null;
  return validation.session.role === "professor" || isAcademicManagementRole(validation.session.role) ? validation : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const validation = await authorizedSession();
  if (!validation) return NextResponse.json({ error: "Seu perfil não pode alterar modelos." }, { status: 403 });
  const { id } = await context.params;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "O conteúdo enviado não é válido." }, { status: 400 });
  }
  const parsed = externalTemplateActionSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Revise a ação solicitada." }, { status: 400 });
  try {
    const source = await getExternalExamTemplate(validation.session.id, id);
    if (!source) return NextResponse.json({ error: "Modelo não encontrado." }, { status: 404 });
    let resultId = id;
    if (parsed.data.action === "duplicate") {
      resultId = await createExternalExamTemplate(validation.session.id, { answerKey: source.answerKey, gradingRules: source.gradingRules, name: `${source.name} — cópia`, structure: source.structure });
    } else {
      const now = new Date().toISOString();
      const changes = parsed.data.action === "archive" ? { archived_at: now }
        : parsed.data.action === "favorite" ? { is_favorite: parsed.data.value }
          : parsed.data.action === "rename" ? { name: parsed.data.name }
            : { last_used_at: now };
      await updateExternalExamTemplate(validation.session.id, id, changes);
    }
    await appendAuditEvent({ actorId: validation.session.id, event: `external_exam_template_${parsed.data.action}`, targetId: resultId });
    return NextResponse.json({ id: resultId, message: "Modelo atualizado." });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o modelo." }, { status: 503 });
  }
}
