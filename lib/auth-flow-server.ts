import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, PRE_AUTH_COOKIE_NAME, applyAuthCookie, buildSessionUser, clearPreAuthCookie, createSessionToken } from "@/lib/auth";
import { createPasswordStamp } from "@/lib/passwords";
import { parsePreAuthToken } from "@/lib/pre-auth";
import { getUserByAccess, isActiveUser, updateLastLogin } from "@/services/supabase-data";
import type { AuthSessionUser, UserRecord } from "@/types/auth";

export async function requirePreAuth() {
  const store = await cookies();
  const preAuth = await parsePreAuthToken(store.get(PRE_AUTH_COOKIE_NAME)?.value);
  if (!preAuth) return null;
  const user = await getUserByAccess(preAuth.access);
  if (!user || user.id !== preAuth.sub || !isActiveUser(user.ativo)) return null;
  return { preAuth, user };
}

export function buildAuthSessionUser(user: UserRecord, remember: boolean, loggedInAt = new Date().toISOString()) {
  return buildSessionUser(
    { id: user.id, nome: user.nome, email: user.email, role: user.perfil, forcePasswordChange: false },
    remember,
    loggedInAt,
  );
}

export async function createFinalSession(
  response: NextResponse,
  input: Awaited<ReturnType<typeof requirePreAuth>>,
  sessionUser?: AuthSessionUser,
) {
  if (!input) throw new Error("Sessão preliminar inválida.");
  const { preAuth } = input;
  // Releitura obrigatória: a etapa MFA pode ter revogado sessões na mesma requisição.
  const user = await getUserByAccess(preAuth.access);
  if (!user || user.id !== preAuth.sub || !isActiveUser(user.ativo)) throw new Error("Conta indisponível para criar sessão.");
  return createUserSession(response, user, preAuth.remember, sessionUser);
}

export async function createUserSession(
  response: NextResponse,
  user: UserRecord,
  remember: boolean,
  sessionUser = buildAuthSessionUser(user, remember),
) {
  const { loggedInAt } = sessionUser;
  const safeUser = { id: user.id, nome: user.nome, email: user.email, role: user.perfil, forcePasswordChange: false };
  const token = await createSessionToken({ user: safeUser, remember, loggedInAt, passwordStamp: createPasswordStamp(`${user.senha}|${user.sessao_revogada_em ?? ""}`) });
  applyAuthCookie(response, token, remember);
  clearPreAuthCookie(response);
  await updateLastLogin(user.id);
  return sessionUser;
}

export function clearFlow(response: NextResponse) { clearPreAuthCookie(response); response.cookies.delete(AUTH_COOKIE_NAME); }
