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
    const safeName = url.name.replace(/[\r\n"\\]/g, "_");
    return new Response(new Uint8Array(url.bytes), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(url.name)}`,
        "Content-Type": url.mimeType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível abrir o arquivo original." }, { status: 404 });
  }
}
