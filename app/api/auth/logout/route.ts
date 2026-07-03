import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";

export const runtime = "nodejs";

function isSameOrigin(originHeader: string | null, hostHeader: string | null) {
  if (!originHeader || !hostHeader) {
    return false;
  }

  try {
    const origin = new URL(originHeader);
    return origin.host === hostHeader;
  } catch {
    return false;
  }
}

export async function POST() {
  const headersList = await headers();
  const origin = headersList.get("origin");
  const host = headersList.get("host");

  if (!isSameOrigin(origin, host)) {
    return NextResponse.json({ error: "Origem da requisicao nao autorizada." }, { status: 403 });
  }

  const response = NextResponse.json({ message: "Sessao encerrada com sucesso." });
  clearAuthCookie(response);
  return response;
}
