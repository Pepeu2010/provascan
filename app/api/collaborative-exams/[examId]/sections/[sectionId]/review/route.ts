import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { canManageAcademicExams } from "@/lib/collaborative-access";
import { hasSameOriginRequest } from "@/lib/request-security";
import { validateSessionToken } from "@/lib/server-session";
import { appendAuditEvent } from "@/services/supabase-data";
import { reviewSection } from "@/services/collaborative-exams";
const schema = z.object({ approved: z.boolean(), note: z.string().trim().max(1000) });
export async function POST(request: Request, { params }: { params: Promise<{ examId: string; sectionId: string }> }) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const validation = await validateSessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!validation.ok || !canManageAcademicExams(validation.session.role)) return NextResponse.json({ error: "Acesso restrito à gestão acadêmica." }, { status: 403 });
  const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Revisão inválida." }, { status: 400 });
  const { examId, sectionId } = await params;
  try { await reviewSection({ examId, sectionId, reviewerId: validation.session.id, ...parsed.data }); await appendAuditEvent({ actorId: validation.session.id, event: parsed.data.approved ? "exam_section_approved" : "exam_section_returned", targetId: sectionId }); return NextResponse.json({ message: parsed.data.approved ? "Bloco aprovado." : "Bloco devolvido ao professor." }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível revisar." }, { status: 400 }); }
}
