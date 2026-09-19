import { NextResponse } from "next/server";
import { getExamSession } from "@/lib/teacher-exam-session";
import { getAssignableAudience } from "@/services/exam-assignments";

export const runtime = "nodejs";

export async function GET() {
  const session = await getExamSession();
  if (!session?.canCreateExam) return NextResponse.json({ error: "Seu perfil não pode criar provas." }, { status: 403 });
  try {
    const audience = await getAssignableAudience({ actorId: session.id, actorRole: session.role });
    return NextResponse.json(audience, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível carregar as opções de aplicação." }, { status: 400 });
  }
}
