import { NextResponse } from "next/server";
import { z } from "zod";
import { getExamSession } from "@/lib/teacher-exam-session";
import { hasSameOriginRequest } from "@/lib/request-security";
import { expandAssignmentGroups } from "@/lib/exam-assignment-policy";
import { syncExamAssignments } from "@/services/exam-assignments";
import { appendAuditEvent } from "@/services/supabase-data";

const schema = z.object({
  groups: z.array(z.object({
    classIds: z.array(z.string().trim().min(1).max(120)).min(1).max(200),
    teacherId: z.string().trim().min(1).max(120),
  }).strict()).max(200),
  justification: z.string().trim().max(500).optional(),
}).strict();

export async function PUT(request: Request, context: { params: Promise<{ examId: string }> }) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const session = await getExamSession();
  if (!session?.canCreateExam) return NextResponse.json({ error: "Seu perfil não pode alterar atribuições." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Envie grupos explícitos de professor e turma." }, { status: 400 });
  const { examId } = await context.params;
  try {
    const assignments = await syncExamAssignments({ actorId: session.id, actorRole: session.role, examId, groups: parsed.data.groups, justification: parsed.data.justification });
    await appendAuditEvent({ actorId: session.id, event: "exam_assignments_synced", targetId: examId, metadata: { assignmentCount: expandAssignmentGroups(parsed.data.groups).length } });
    return NextResponse.json({ assignments });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível salvar as atribuições." }, { status: 400 }); }
}
