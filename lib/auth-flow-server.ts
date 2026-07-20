import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, PRE_AUTH_COOKIE_NAME, applyAuthCookie, clearPreAuthCookie, createSessionToken } from "@/lib/auth";
import { createPasswordStamp } from "@/lib/passwords";
import { parsePreAuthToken } from "@/lib/pre-auth";
import { normalizeSubject } from "@/lib/subject-scope";
import { getUserByAccess, isActiveUser, updateLastLogin } from "@/services/google-sheets";

export async function requirePreAuth() {
  const store = await cookies();
  const preAuth = await parsePreAuthToken(store.get(PRE_AUTH_COOKIE_NAME)?.value);
  if (!preAuth) return null;
  const user = await getUserByAccess(preAuth.access);
  if (!user || user.id !== preAuth.sub || !isActiveUser(user.ativo)) return null;
  return { preAuth, user };
}

export async function createFinalSession(response: NextResponse, input: Awaited<ReturnType<typeof requirePreAuth>>) {
  if (!input) throw new Error("Sessão preliminar inválida.");
  const { preAuth } = input;
  // Releitura obrigatória: a etapa MFA pode ter revogado sessões na mesma requisição.
  const user = await getUserByAccess(preAuth.access);
  if (!user || user.id !== preAuth.sub || !isActiveUser(user.ativo)) throw new Error("Conta indisponível para criar sessão.");
  const loggedInAt = new Date().toISOString();
  const safeUser = { id: user.id, nome: user.nome, email: user.email, role: user.perfil, subject: normalizeSubject(user.disciplina), forcePasswordChange: false };
  const token = await createSessionToken({ user: safeUser, remember: preAuth.remember, loggedInAt, passwordStamp: createPasswordStamp(`${user.senha}|${user.sessao_revogada_em ?? ""}`) });
  applyAuthCookie(response, token, preAuth.remember);
  clearPreAuthCookie(response);
  await updateLastLogin(user.id);
  return safeUser;
}

export function clearFlow(response: NextResponse) { clearPreAuthCookie(response); response.cookies.delete(AUTH_COOKIE_NAME); }
