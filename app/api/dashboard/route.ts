import { NextResponse } from "next/server";
import { correctionSessions, dashboardMetrics } from "@/lib/mock-data";
import { getSystemSnapshot } from "@/services/google-sheets";

export async function GET() {
  const snapshot = await getSystemSnapshot();

  return NextResponse.json({
    metrics: dashboardMetrics,
    latestCorrection: correctionSessions[0],
    storage: snapshot,
  }, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
