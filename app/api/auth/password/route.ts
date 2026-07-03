import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { applyAuthCookie, AUTH_COOKIE_NAME, buildSessionUser, createSessionToken, parseSessionToken } from "@/lib/auth";
import { createPasswordStamp, createStoredPassword, verifyPassword } from "@/lib/passwords";
import {
  GoogleSheetsConnectionError,
  GoogleSheetsSchemaError,
  getUserByEmail,
  updateUserPassword,
} from "@/services/google-sheets";

export const runtime = "nodejs";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(256),
    newPassword: z.string().min(8).max(256),
    confirmPassword: z.string().min(8).max(256),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "A confirmação da senha não confere.",
    path: ["confirmPassword"],
  });

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

export async function POST(request: Request) {
  const headersList = await headers();
  const origin = headersList.get("origin");
  const host = headersList.get("host");

  if (!isSameOrigin(origin, host)) {
    return NextResponse.json({ error: "Origem da requisição não autorizada." }, { status: 403 });
  }

  const cookieStore = await cookies();
  const session = await parseSessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
  }

  try {
    const payload = changePasswordSchema.parse(await request.json());
    const user = await getUserByEmail(session.email);

    if (!user) {
      return NextResponse.json({ error: "Email ou senha inválidos." }, { status: 401 });
    }

    const currentPasswordMatches = await verifyPassword(payload.currentPassword, user.senha);
    if (!currentPasswordMatches) {
      return NextResponse.json({ error: "Email ou senha inválidos." }, { status: 401 });
    }

    const nextStoredPassword = await createStoredPassword(payload.newPassword);
    await updateUserPassword(user.id, nextStoredPassword);

    const loggedInAt = new Date().toISOString();
    const safeUser = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.perfil,
      forcePasswordChange: false,
    };

    const token = await createSessionToken({
      user: safeUser,
      remember: session.remember,
      loggedInAt,
      passwordStamp: createPasswordStamp(nextStoredPassword),
    });

    const response = NextResponse.json({
      message: "Senha alterada com sucesso.",
      redirectTo: "/dashboard",
      user: buildSessionUser(safeUser, session.remember, loggedInAt),
    });
    applyAuthCookie(response, token, session.remember);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }

    if (error instanceof GoogleSheetsConnectionError || error instanceof GoogleSheetsSchemaError) {
      return NextResponse.json({ error: "Erro ao conectar com a planilha." }, { status: 503 });
    }

    return NextResponse.json({ error: "Erro interno ao alterar senha." }, { status: 500 });
  }
}
