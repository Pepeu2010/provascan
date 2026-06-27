import { NextResponse } from "next/server";
import { analyzeAnswerSheet } from "@/services/exam-correction";

export async function POST() {
  const session = await analyzeAnswerSheet();
  return NextResponse.json(session);
}
