import { NextResponse } from "next/server";
import { archiveExpiredExams } from "@/services/exam-retention";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const result = await archiveExpiredExams();
    return NextResponse.json({ archived: result.archivedExamIds.length, cutoff: result.cutoff, retentionDays: result.retentionDays });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha na retenção." }, { status: 503 }); }
}
