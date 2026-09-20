import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { canManageUsers } from "@/lib/access-control";
import { hasSameOriginRequest } from "@/lib/request-security";
import { buildRateLimitKey, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { validateSessionToken } from "@/lib/server-session";
import { appendAuditEvent, getOperationalSnapshot } from "@/services/supabase-data";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const validation = await validateSessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!validation.ok || !canManageUsers(validation.session.role)) {
    return NextResponse.json({ error: "A exportação institucional é restrita ao Admin." }, { status: 403 });
  }
  const rateLimit = await consumeRateLimit({ bucket: "admin-operational-export", key: buildRateLimitKey(getClientIp(request.headers), validation.session.id), limit: 3, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.ok) return NextResponse.json({ error: "Muitas exportações em sequência. Aguarde antes de tentar novamente." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
  try {
    const snapshot = await getOperationalSnapshot();
    const generatedAt = new Date().toISOString();
    const document = JSON.stringify({
      data: snapshot.data,
      exportedAt: generatedAt,
      format: "provascan-operational-export/v1",
      note: "Exportação administrativa de dados operacionais. Não contém senhas, segredos MFA ou arquivos de imagem.",
      revision: snapshot.revision,
    });
    await appendAuditEvent({ actorId: validation.session.id, event: "operational_data_exported", metadata: { revision: snapshot.revision } });
    return new Response(document, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="provascan-operacional-${generatedAt.slice(0, 10)}.json"`,
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível preparar a exportação institucional." }, { status: 503 });
  }
}
