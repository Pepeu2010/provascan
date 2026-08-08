import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { canManageAcademicExams } from "@/lib/collaborative-access";
import { hasSameOriginRequest } from "@/lib/request-security";
import { validateSessionToken } from "@/lib/server-session";
import { appendAuditEvent } from "@/services/supabase-data";
import { createCollaborativeExam, listCollaborativeExams, listTeachers } from "@/services/collaborative-exams";

const text = z.string().trim().min(1).max(200);
const schema = z.object({ title: text, audienceId: text, audienceLabel: text, groupType: text, yearSegment: text, alternatives: z.array(text).min(2).max(10), examDate: z.string().min(1).max(80), sections: z.array(z.object({ subject: text, teacherId: text, questionCount: z.number().int().min(1).max(200) })).min(1).max(30) });

async function manager() {
  const store = await cookies();
  const validation = await validateSessionToken(store.get(AUTH_COOKIE_NAME)?.value);
  if (!validation.ok) return null;
  return canManageAcademicExams(validation.session.role) ? validation : null;
}

export async function GET() {
  const validation = await manager();
  if (!validation) return NextResponse.json({ error: "Acesso restrito à gestão acadêmica." }, { status: 403 });
  try { return NextResponse.json({ exams: await listCollaborativeExams(), teachers: await listTeachers() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Não foi possível carregar as provas." }, { status: 503 }); }
}

export async function POST(request: Request) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const validation = await manager();
  if (!validation) return NextResponse.json({ error: "Acesso restrito à gestão acadêmica." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados da prova inválidos." }, { status: 400 });
  try {
    const examId = await createCollaborativeExam(parsed.data);
    await appendAuditEvent({ actorId: validation.session.id, event: "collaborative_exam_created", targetId: examId, metadata: { sections: parsed.data.sections.length } });
    return NextResponse.json({ examId }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível criar a prova." }, { status: 400 }); }
}
