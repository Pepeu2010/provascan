import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { canManageAcademicExams, isTeacherRole } from "@/lib/collaborative-access";
import { externalCorrectionBatchSchema, externalCorrectionSchema } from "@/lib/universal-exam-validation";
import { hasSameOriginRequest } from "@/lib/request-security";
import { buildRateLimitKey, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { validateSessionToken } from "@/lib/server-session";
import { getExternalExamTemplate, listExternalCorrections, saveExternalCorrections } from "@/services/external-exams";
import { gradeWithRules } from "@/services/universal-grading-rules";
import { appendAuditEvent } from "@/services/supabase-data";

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
    return NextResponse.json({ corrections: await listExternalCorrections(validation.session.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar o histórico de correções externas." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const validation = await authorizedSession();
  if (!validation) return NextResponse.json({ error: "Seu perfil não pode salvar correções." }, { status: 403 });
  const limit = await consumeRateLimit({
    bucket: "external-correction-create",
    key: buildRateLimitKey(getClientIp(request.headers), validation.session.id),
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.ok) return NextResponse.json({ error: "Muitas correções em sequência. Aguarde antes de tentar novamente." }, { status: 429 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "O conteúdo enviado não é um JSON válido." }, { status: 400 });
  }
  const parsed = externalCorrectionBatchSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Revise as respostas desta correção." }, { status: 400 });
  try {
    const templates = new Map<string, Awaited<ReturnType<typeof getExternalExamTemplate>>>();
    const entries = [] as Array<{
      input: ReturnType<typeof externalCorrectionSchema.parse>;
      summary: ReturnType<typeof gradeWithRules>["summary"];
    }>;
    for (const correction of parsed.data.corrections) {
      let template = null;
      if (correction.templateId) {
        if (!templates.has(correction.templateId)) {
          templates.set(correction.templateId, await getExternalExamTemplate(validation.session.id, correction.templateId));
        }
        template = templates.get(correction.templateId) ?? null;
        if (!template) {
          return NextResponse.json({ error: "O modelo selecionado não existe ou pertence a outra conta." }, { status: 400 });
        }
      }
      const trustedValidation = externalCorrectionSchema.safeParse(template
        ? { ...correction, answerKey: template.answerKey, structure: template.structure }
        : correction);
      if (!trustedValidation.success) {
        return NextResponse.json({ error: "As respostas não correspondem ao modelo salvo." }, { status: 400 });
      }
      const grade = gradeWithRules({ answerKey: trustedValidation.data.answerKey, answers: trustedValidation.data.answers, rules: trustedValidation.data.gradingRules, structure: trustedValidation.data.structure });
      if (grade.reviewQuestions.length) {
        return NextResponse.json({ error: "Conclua a revisão das marcações ambíguas antes de salvar." }, { status: 400 });
      }
      entries.push({ input: trustedValidation.data, summary: grade.summary });
    }
    const ids = await saveExternalCorrections(validation.session.id, entries);
    await Promise.allSettled(ids.map((id, index) => appendAuditEvent({ actorId: validation.session.id, event: "external_correction_created", targetId: id, metadata: { questionCount: entries[index].input.answers.length } })));
    return NextResponse.json({ ids, message: `${ids.length} ${ids.length === 1 ? "correção externa salva" : "correções externas salvas"} no histórico.`, summaries: entries.map((entry) => entry.summary) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar esta correção externa." }, { status: 503 });
  }
}
