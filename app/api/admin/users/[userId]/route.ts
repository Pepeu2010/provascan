import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { canAssignManagedRole, canManageTargetUser, canManageUsers, type ManagedRole } from "@/lib/access-control";
import { hashPassword, validateNewPassword } from "@/lib/passwords";
import { hasSameOriginRequest } from "@/lib/request-security";
import { buildRateLimitKey, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { validateSessionToken } from "@/lib/server-session";
import { appendAuditEvent, deleteManagedUser, listUsersForAdmin, resetManagedUserMfa, setManagedUserActive, setManagedUserTemporaryPassword, SupabaseConnectionError, SupabaseSchemaError, updateManagedUser } from "@/services/supabase-data";

const roles = z.enum(["admin", "vice_diretor", "coordenador", "professor"]);
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update"), nome: z.string().trim().min(3).max(120), acesso: z.string().trim().min(3).max(120), perfil: roles }),
  z.object({ action: z.literal("set-active"), active: z.boolean() }),
  z.object({ action: z.literal("reset-mfa") }),
  z.object({ action: z.literal("set-password"), senhaTemporaria: z.string().min(10).max(160) }),
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const validation = await validateSessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!validation.ok || !canManageUsers(validation.session.role)) return NextResponse.json({ error: "Acesso restrito a perfis de gestão." }, { status: 403 });
  const { userId } = await params;
  if (!userId.trim() || userId === validation.session.id) return NextResponse.json({ error: "Use sua própria conta para alterar seus dados e segurança." }, { status: 400 });
  const limit = await consumeRateLimit({ bucket: "admin-user-manage", key: buildRateLimitKey(getClientIp(request.headers), validation.session.id), limit: 30, windowMs: 15 * 60 * 1000 });
  if (!limit.ok) return NextResponse.json({ error: "Muitas alterações. Aguarde antes de tentar novamente." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  try {
    const input = schema.parse(await request.json());
    const target = (await listUsersForAdmin()).find((user) => user.id === userId);
    if (!target) return NextResponse.json({ error: "Pessoa não encontrada." }, { status: 404 });
    if (!canManageTargetUser(validation.session.role, target.perfil)) {
      return NextResponse.json({ error: "Seu perfil não pode alterar esta conta." }, { status: 403 });
    }
    if (input.action === "update" && !canAssignManagedRole(validation.session.role, input.perfil as ManagedRole)) {
      return NextResponse.json({ error: "Seu perfil não pode atribuir esse nível de acesso." }, { status: 403 });
    }
    if (input.action === "update") await updateManagedUser(userId, input);
    if (input.action === "set-active") await setManagedUserActive(userId, input.active);
    if (input.action === "reset-mfa") await resetManagedUserMfa(userId);
    if (input.action === "set-password") {
      const passwordError = validateNewPassword(input.senhaTemporaria, target.email);
      if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
      await setManagedUserTemporaryPassword(userId, await hashPassword(input.senhaTemporaria));
    }
    await appendAuditEvent({ actorId: validation.session.id, event: `managed_user_${input.action}`, targetId: userId });
    return NextResponse.json({ message: input.action === "set-active" ? (input.active ? "Acesso reativado. A pessoa deverá trocar a senha no próximo login." : "Acesso desativado e sessões encerradas.") : input.action === "reset-mfa" ? "MFA removido. A pessoa deverá configurar novamente no próximo acesso." : input.action === "set-password" ? "Senha temporária definida e sessões anteriores encerradas." : "Dados da pessoa atualizados." });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Revise os dados informados." }, { status: 400 });
    if (error instanceof SupabaseConnectionError || error instanceof SupabaseSchemaError) return NextResponse.json({ error: error.message || "Não foi possível atualizar esta pessoa." }, { status: 400 });
    return NextResponse.json({ error: "Não foi possível atualizar esta pessoa." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  if (!(await hasSameOriginRequest())) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const validation = await validateSessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!validation.ok || !canManageUsers(validation.session.role)) return NextResponse.json({ error: "Acesso restrito a perfis de gestão." }, { status: 403 });
  const { userId } = await params;
  if (!userId.trim() || userId === validation.session.id) return NextResponse.json({ error: "Sua própria conta não pode ser excluída por esta tela." }, { status: 400 });
  const limit = await consumeRateLimit({ bucket: "admin-user-delete", key: buildRateLimitKey(getClientIp(request.headers), validation.session.id), limit: 8, windowMs: 15 * 60 * 1000 });
  if (!limit.ok) return NextResponse.json({ error: "Muitas exclusões. Aguarde antes de tentar novamente." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  try {
    const target = (await listUsersForAdmin()).find((user) => user.id === userId);
    if (!target) return NextResponse.json({ error: "Pessoa não encontrada." }, { status: 404 });
    if (!canManageTargetUser(validation.session.role, target.perfil)) return NextResponse.json({ error: "Seu perfil não pode excluir esta conta." }, { status: 403 });
    await deleteManagedUser(userId);
    await appendAuditEvent({ actorId: validation.session.id, event: "managed_user_deleted", targetId: userId, metadata: { role: target.perfil } });
    return NextResponse.json({ message: `${target.nome} foi excluído. Provas e correções históricas foram preservadas.` });
  } catch (error) {
    if (error instanceof SupabaseConnectionError || error instanceof SupabaseSchemaError) return NextResponse.json({ error: error.message || "Não foi possível excluir esta pessoa." }, { status: 400 });
    return NextResponse.json({ error: "Não foi possível excluir esta pessoa." }, { status: 500 });
  }
}
