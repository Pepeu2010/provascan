import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { isAdminRole } from "@/lib/access-control";
import { hashPassword, validateNewPassword } from "@/lib/passwords";
import { hasSameOriginRequest } from "@/lib/request-security";
import { buildRateLimitKey, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { validateSessionToken } from "@/lib/server-session";
import { appendAuditEvent, createManagedUser, listUsersForAdmin, SupabaseConnectionError, SupabaseSchemaError } from "@/services/supabase-data";

const roles = z.enum(["admin", "vice_diretor", "coordenador", "professor"]);
const createSchema = z.object({ nome: z.string().trim().min(3).max(120), acesso: z.string().trim().min(3).max(120), perfil: roles, senhaTemporaria: z.string().min(10).max(160) });

async function requireAdmin() {
  const validation = await validateSessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!validation.ok) return null;
  return isAdminRole(validation.session.role) ? validation : null;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Acesso restrito ao admin." }, { status: 403 });
  try { return NextResponse.json({ users: await listUsersForAdmin() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Não foi possível carregar as pessoas." }, { status: 503 }); }
}

export async function POST(request: Request) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Acesso restrito ao admin." }, { status: 403 });
  const limit = await consumeRateLimit({ bucket: "admin-user-create", key: buildRateLimitKey(getClientIp(request.headers), auth.session.id), limit: 10, windowMs: 15 * 60 * 1000 });
  if (!limit.ok) return NextResponse.json({ error: "Muitos cadastros. Aguarde antes de tentar novamente." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  try {
    const input = createSchema.parse(await request.json());
    const passwordError = validateNewPassword(input.senhaTemporaria, input.acesso);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
    await createManagedUser({ nome: input.nome, acesso: input.acesso, perfil: input.perfil, passwordHash: await hashPassword(input.senhaTemporaria) });
    await appendAuditEvent({ actorId: auth.session.id, event: "managed_user_created", metadata: { role: input.perfil } });
    return NextResponse.json({ message: "Pessoa cadastrada. A troca de senha será obrigatória no primeiro acesso." }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Revise os dados da nova pessoa." }, { status: 400 });
    if (error instanceof SupabaseConnectionError || error instanceof SupabaseSchemaError) return NextResponse.json({ error: "Não foi possível cadastrar esta pessoa. Verifique se o acesso já está em uso." }, { status: 400 });
    return NextResponse.json({ error: "Não foi possível cadastrar esta pessoa." }, { status: 500 });
  }
}
