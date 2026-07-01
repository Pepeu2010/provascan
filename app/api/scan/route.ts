import { NextResponse } from "next/server";
import { analyzeAnswerSheet } from "@/services/exam-correction";

export async function POST() {
  try {
    const session = await analyzeAnswerSheet();
    return NextResponse.json(session, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Falha ao analisar o cartao-resposta." },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 500,
      },
    );
  }
}
