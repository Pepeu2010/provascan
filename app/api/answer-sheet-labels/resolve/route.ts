import { NextResponse } from "next/server";
import { z } from "zod";
import { getExamSession } from "@/lib/teacher-exam-session";
import { resolveAnswerSheetToken } from "@/services/answer-sheet-labels";

export const runtime = "nodejs";
const bodySchema = z.object({ token: z.string().regex(/^PSA1\.[A-Za-z0-9_-]{43}$/) }).strict();

export async function POST(request: Request) {
  const session = await getExamSession();
  if (!session) return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Adesivo inválido." }, { status: 400 });
  try {
    const assignment = await resolveAnswerSheetToken({ actorId: session.id, institutionalView: session.institutionalView, token: parsed.data.token });
    if (!assignment) return NextResponse.json({ error: "Adesivo inválido, revogado ou sem acesso." }, { status: 404 });
    return NextResponse.json({ assignment }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível validar o adesivo." }, { status: 503 }); }
}
