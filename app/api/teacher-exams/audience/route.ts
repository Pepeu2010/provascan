import { NextResponse } from "next/server";
import { getExamSession } from "@/lib/teacher-exam-session";
import { getAssignableAudience } from "@/services/exam-assignments";
import { listSubjects, resolveSubjectSnapshot } from "@/services/pedagogical-scopes";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getExamSession();
  if (!session?.canCreateExam) return NextResponse.json({ error: "Seu perfil não pode criar provas." }, { status: 403 });
  try {
    const subjectId = new URL(request.url).searchParams.get("subjectId")?.trim();
    const subjects = await listSubjects();
    if (!subjectId) return NextResponse.json({ subjects }, { headers: { "Cache-Control": "no-store" } });
    await resolveSubjectSnapshot(subjectId);
    const audience = await getAssignableAudience({ actorId: session.id, actorRole: session.role, subjectId });
    return NextResponse.json({ subjects, ...audience }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível carregar as opções de aplicação." }, { status: 400 });
  }
}
