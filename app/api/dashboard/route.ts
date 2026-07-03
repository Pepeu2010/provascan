import { NextResponse } from "next/server";
import { correctionSessions, dashboardMetrics } from "@/lib/mock-data";
import { getSystemSnapshot } from "@/services/google-sheets";

export async function GET() {
  try {
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
  } catch {
    return NextResponse.json(
      { error: "Não foi possível carregar o resumo operacional." },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 500,
      },
    );
  }
}
