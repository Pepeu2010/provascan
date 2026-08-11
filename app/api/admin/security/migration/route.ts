import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { canManageUsers } from "@/lib/access-control";
import { hasSameOriginRequest } from "@/lib/request-security";
import { buildRateLimitKey, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { validateSessionToken } from "@/lib/server-session";
import { appendAuditEvent, migrateUsersSecuritySchema } from "@/services/supabase-data";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem da requisição não autorizada." }, { status: 403 });
  const store = await cookies(); const validation = await validateSessionToken(store.get(AUTH_COOKIE_NAME)?.value);
  if (!validation.ok || !canManageUsers(validation.session.role)) return NextResponse.json({ error: "Acesso restrito à gestão." }, { status: 403 });
  const rateLimit = await consumeRateLimit({ bucket: "admin-security-migration", key: buildRateLimitKey(getClientIp(request.headers), validation.session.id), limit: 3, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.ok) return NextResponse.json({ error: "Muitas tentativas de migração. Aguarde antes de tentar novamente." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rateLimit.retryAfterSeconds) } });
  try {
    const report = await migrateUsersSecuritySchema();
    await appendAuditEvent({ actorId: validation.session.id, event: "USERS_SECURITY_SCHEMA_MIGRATED", metadata: { addedHeaders: report.addedHeaders.length, auditCreated: report.auditCreated } });
    return NextResponse.json({ report });
  } catch { return NextResponse.json({ error: "Não foi possível migrar a estrutura de segurança." }, { status: 503 }); }
}
