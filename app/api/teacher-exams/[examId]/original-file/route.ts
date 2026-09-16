import { NextResponse } from "next/server";
import { getExamSession } from "@/lib/teacher-exam-session";
import { createOriginalFileDownload } from "@/services/exam-import";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ examId: string }> }) {
  const session = await getExamSession();
  if (!session) return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
  const { examId } = await context.params;
  try {
    const url = await createOriginalFileDownload(session.id, examId, session.institutionalView);
    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível abrir o arquivo original." }, { status: 404 });
  }
}
