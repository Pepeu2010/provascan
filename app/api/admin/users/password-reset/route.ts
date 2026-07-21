import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { hasSameOriginRequest } from "@/lib/request-security";
import { canManageUsers } from "@/lib/access-control";
import { buildRateLimitKey, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { clearInvalidSessionCookie, validateSessionToken } from "@/lib/server-session";
import {
  SupabaseConnectionError,
  SupabaseSchemaError,
  listUsersForAdmin,
  updateAllUsersPasswordChangeFlag,
  updateUserPasswordChangeFlag,
} from "@/services/supabase-data";

export const runtime = "nodejs";

const passwordResetSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("all"),
    shouldForce: z.boolean(),
  }),
  z.object({
    mode: z.literal("single"),
    shouldForce: z.boolean(),
    userId: z.string().min(1),
  }),
]);

async function requireManagementSession() {
  const cookieStore = await cookies();
  const validation = await validateSessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!validation.ok) {
    const response = NextResponse.json(
      { error: "Autenticação necessária." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
    clearInvalidSessionCookie(response);
    return { ok: false as const, response };
  }

  if (!canManageUsers(validation.session.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Acesso restrito a perfis de gestão." }, { status: 403 }),
    };
  }

  return { ok: true as const, session: validation.session };
}

export async function GET() {
  const auth = await requireManagementSession();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const users = await listUsersForAdmin();
    return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SupabaseConnectionError || error instanceof SupabaseSchemaError) {
      return NextResponse.json({ error: "Erro ao acessar o banco de dados." }, { status: 503 });
    }

    return NextResponse.json({ error: "Erro interno ao carregar usuários." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await hasSameOriginRequest())) {
    return NextResponse.json({ error: "Origem da requisição não autorizada." }, { status: 403 });
  }
  const auth = await requireManagementSession();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const rateLimit = await consumeRateLimit({
      bucket: "admin-password-reset",
      key: buildRateLimitKey(getClientIp(new Headers(request.headers)), auth.session.id, auth.session.email),
      limit: 20,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: "Muitas alterações seguidas. Aguarde alguns minutos e tente novamente." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const payload = passwordResetSchema.parse(await request.json());

    if (payload.mode === "all") {
      const result = await updateAllUsersPasswordChangeFlag(payload.shouldForce);
      return NextResponse.json({
        message: payload.shouldForce
          ? "Todos os usuários foram marcados para trocar a senha no próximo login."
          : "A obrigatoriedade de troca de senha foi removida para todos os usuários.",
        updated: result.updated,
      });
    }

    await updateUserPasswordChangeFlag(payload.userId, payload.shouldForce);
    return NextResponse.json({
      message: payload.shouldForce
        ? "Usuário marcado para trocar a senha no próximo login."
        : "Usuário liberado para entrar sem troca obrigatória.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }

    if (error instanceof SupabaseConnectionError || error instanceof SupabaseSchemaError) {
      return NextResponse.json({ error: "Erro ao acessar o banco de dados." }, { status: 503 });
    }

    return NextResponse.json({ error: "Erro interno ao atualizar usuários." }, { status: 500 });
  }
}
