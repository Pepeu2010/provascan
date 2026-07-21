import { NextResponse } from "next/server";
import {
  applyAuthCookie,
  buildSessionUser,
  clearAuthCookie,
  createSessionToken,
  parseSessionToken,
} from "@/lib/auth";
import { normalizeSubject } from "@/lib/subject-scope";
import { createPasswordStamp } from "@/lib/passwords";
import { getUserByEmail, isActiveUser, shouldForcePasswordChange } from "@/services/supabase-data";
import type { AuthSessionUser, SafeAuthUser } from "@/types/auth";

type ValidSessionResult =
  | {
      ok: true;
      session: AuthSessionUser;
      shouldRefreshCookie: boolean;
      user: SafeAuthUser;
      passwordStamp: string;
    }
  | {
      ok: false;
      reason: "missing" | "invalid";
    };

function buildSafeUserFromSheetUser(user: {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  disciplina?: string;
  trocar_senha: string;
}) {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    role: user.perfil,
    subject: normalizeSubject(user.disciplina),
    forcePasswordChange: shouldForcePasswordChange(user.trocar_senha),
  } satisfies SafeAuthUser;
}

export async function validateSessionToken(token: string | undefined): Promise<ValidSessionResult> {
  const parsed = await parseSessionToken(token);
  if (!parsed) {
    return { ok: false, reason: "missing" };
  }

  const user = await getUserByEmail(parsed.email);
  if (!user || !isActiveUser(user.ativo)) {
    return { ok: false, reason: "invalid" };
  }

  const passwordStamp = createPasswordStamp(`${user.senha}|${user.sessao_revogada_em ?? ""}`);
  if (passwordStamp !== parsed.passwordStamp) {
    return { ok: false, reason: "invalid" };
  }

  const safeUser = buildSafeUserFromSheetUser(user);
  const session = buildSessionUser(safeUser, parsed.remember, parsed.loggedInAt);

  return {
    ok: true,
    session,
    shouldRefreshCookie:
      safeUser.nome !== parsed.nome ||
      safeUser.role !== parsed.role ||
      safeUser.subject !== parsed.subject ||
      safeUser.forcePasswordChange !== parsed.forcePasswordChange,
    user: safeUser,
    passwordStamp,
  };
}

export async function syncValidatedSessionCookie(
  response: NextResponse,
  input: {
    loggedInAt: string;
    passwordStamp: string;
    remember: boolean;
    user: SafeAuthUser;
  },
) {
  const token = await createSessionToken(input);
  applyAuthCookie(response, token, input.remember);
}

export function clearInvalidSessionCookie(response: NextResponse) {
  clearAuthCookie(response);
}
