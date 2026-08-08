import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { isTeacherRole } from "@/lib/collaborative-access";
import { hasSameOriginRequest } from "@/lib/request-security";
import { validateSessionToken } from "@/lib/server-session";
import { appendAuditEvent } from "@/services/supabase-data";
import { saveSectionAnswers } from "@/services/collaborative-exams";

const schema = z.object({ answers: z.array(z.string().trim().min(1).max(30)).max(200), submit: z.boolean() });
export async function PUT(request: Request, { params }: { params: Promise<{ examId: string; sectionId: string }> }) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const store = await cookies(); const validation = await validateSessionToken(store.get(AUTH_COOKIE_NAME)?.value);
  if (!validation.ok || !isTeacherRole(validation.session.role)) return NextResponse.json({ error: "Acesso restrito a professores." }, { status: 403 });
  const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Gabarito inválido." }, { status: 400 });
  const { examId, sectionId } = await params;
  try {
    await saveSectionAnswers({ examId, sectionId, teacherId: validation.session.id, ...parsed.data });
    await appendAuditEvent({ actorId: validation.session.id, event: parsed.data.submit ? "exam_section_submitted" : "exam_section_saved", targetId: sectionId });
    return NextResponse.json({ message: parsed.data.submit ? "Bloco enviado para conferência." : "Rascunho salvo." });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível salvar." }, { status: 400 }); }
}
