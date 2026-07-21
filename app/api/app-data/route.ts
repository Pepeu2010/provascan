import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { hasSameOriginRequest } from "@/lib/request-security";
import { OperationalLockBusyError, OperationalLockUnavailableError, withOperationalWriteLock } from "@/lib/operational-lock";
import { canManageAllSubjects, filterAppDataForSubject, mergeScopedAppData, requireScopedSubject } from "@/lib/subject-scope";
import { clearInvalidSessionCookie, syncValidatedSessionCookie, validateSessionToken } from "@/lib/server-session";
import {
  getOperationalAppData,
  getOperationalSnapshot,
  getOperationalRevision,
  SupabaseConfigError,
  SupabaseConnectionError,
  SupabaseSchemaError,
  saveOperationalAppData,
} from "@/services/supabase-data";
import type { AppDataState } from "@/lib/app-data";

export const runtime = "nodejs";

const text = z.string().trim().min(1).max(500);
const id = z.string().trim().min(1).max(120);
const studentSchema = z.object({ id, nome: text, matricula: text, turma: id, status: z.enum(["Ativo", "Transferido", "Inativo"]) }).strict();
const classSchema = z.object({ id, nome: text, professor: text, ano: z.string().max(80), periodo: z.string().max(80), audienceId: z.string().max(120).optional(), audienceLabel: z.string().max(200).optional(), groupType: z.string().max(40).optional(), requiresManualGrouping: z.boolean().optional(), yearSegment: z.string().max(20).optional() }).strict();
const examSchema = z.object({ id, titulo: text, subject: z.string().max(120), audienceId: z.string().max(120), audienceLabel: z.string().max(200), groupType: z.string().max(40), yearSegment: z.string().max(20), quantidadeQuestoes: z.number().int().min(1).max(200), alternativas: z.array(z.string().trim().min(1).max(30)).min(2).max(10), data: z.string().max(80), codigo: text, templateVersion: z.string().max(80) }).strict();
const appDataSchema = z.object({
  answerKeys: z.array(z.object({ provaId: id, questao: z.number().int().min(1).max(200), respostaCorreta: text }).strict()).max(20000),
  classes: z.array(classSchema).max(1000),
  correctionRules: z.array(z.object({ provaId: id, notaMaxima: z.number().finite().min(0).max(1000), arredondamentoCasas: z.number().int().min(0).max(4), pesoPadrao: z.number().finite().min(0).max(100), pesosPorQuestao: z.array(z.object({ questao: z.number().int().min(1).max(200), peso: z.number().finite().min(0).max(100) }).strict()).max(200), questoesAnuladas: z.array(z.number().int().min(1).max(200)).max(200), modoQuestaoAnulada: z.enum(["full-credit", "ignore"]) }).strict()).max(1000),
  corrections: z.array(z.unknown()).max(20000),
  exams: z.array(examSchema).max(1000),
  students: z.array(studentSchema).max(10000),
  teacherProfile: z.object({ nome: text, email: z.string().email().max(256), escola: text }).strict(),
}).strict();

async function validateRequestSession() {
  const cookieStore = await cookies();
  return validateSessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

function buildAuthErrorResponse() {
  return NextResponse.json(
    { error: "Autenticação necessária." },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  const validation = await validateRequestSession();

  if (!validation.ok) {
    const response = buildAuthErrorResponse();
    clearInvalidSessionCookie(response);
    return response;
  }

  try {
    const snapshot = await getOperationalSnapshot();
    const data = snapshot.data;
    const subject = requireScopedSubject(validation.session);
    if (!canManageAllSubjects(validation.session.role) && !subject) {
      return NextResponse.json({ error: "Usuário sem disciplina vinculada na aba usuários." }, { status: 403 });
    }
    const filteredData = filterAppDataForSubject(data, subject);
    const finalResponse = NextResponse.json({ data: filteredData, revision: snapshot.revision }, {
      headers: { "Cache-Control": "no-store" },
    });

    if (validation.shouldRefreshCookie) {
      await syncValidatedSessionCookie(finalResponse, {
        loggedInAt: validation.session.loggedInAt,
        passwordStamp: validation.passwordStamp,
        remember: validation.session.remember,
        user: validation.user,
      });
    }

    return finalResponse;
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json({ error: "Banco de dados não configurado." }, { status: 500 });
    }

    if (error instanceof SupabaseConnectionError || error instanceof SupabaseSchemaError) {
      return NextResponse.json({ error: "Erro ao carregar dados operacionais." }, { status: 503 });
    }

    return NextResponse.json({ error: "Erro interno ao carregar os dados operacionais." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await hasSameOriginRequest())) {
    return NextResponse.json({ error: "Origem da requisição não autorizada." }, { status: 403 });
  }
  const validation = await validateRequestSession();

  if (!validation.ok) {
    const response = buildAuthErrorResponse();
    clearInvalidSessionCookie(response);
    return response;
  }

  try {
    const payload = (await request.json()) as { data?: unknown; revision?: unknown };
    const parsedData = appDataSchema.safeParse(payload.data);
    if (!parsedData.success) {
      return NextResponse.json({ error: "Payload inválido para persistência." }, { status: 400 });
    }
    if (typeof payload.revision !== "string" || !/^\d+$/.test(payload.revision)) {
      return NextResponse.json({ error: "Revisão obrigatória para salvar." }, { status: 400 });
    }

    const subject = requireScopedSubject(validation.session);
    if (!canManageAllSubjects(validation.session.role) && !subject) {
      return NextResponse.json({ error: "Usuário sem disciplina vinculada na aba usuários." }, { status: 403 });
    }

    const revision = await withOperationalWriteLock(process.env.SUPABASE_URL ?? "unconfigured", async () => {
      const currentRevision = await getOperationalRevision();
      if (currentRevision !== payload.revision) {
        throw new SupabaseSchemaError("CONFLICT");
      }
      const currentData = await getOperationalAppData();
      const nextData = mergeScopedAppData(currentData, parsedData.data as AppDataState, subject);
      return saveOperationalAppData(nextData, { actorId: validation.session.id, revision: currentRevision });
    });

    const response = NextResponse.json(
      { message: "Dados operacionais salvos com sucesso.", revision },
      { headers: { "Cache-Control": "no-store" } },
    );

    if (validation.shouldRefreshCookie) {
      await syncValidatedSessionCookie(response, {
        loggedInAt: validation.session.loggedInAt,
        passwordStamp: validation.passwordStamp,
        remember: validation.session.remember,
        user: validation.user,
      });
    }

    return response;
  } catch (error) {
    if (error instanceof SupabaseSchemaError && error.message === "CONFLICT") {
      return NextResponse.json({ error: "Os dados foram alterados em outra sessão. Recarregue antes de salvar.", code: "REVISION_CONFLICT" }, { status: 409 });
    }
    if (error instanceof OperationalLockBusyError || error instanceof OperationalLockUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json({ error: "Banco de dados não configurado." }, { status: 500 });
    }

    if (error instanceof SupabaseConnectionError || error instanceof SupabaseSchemaError) {
      return NextResponse.json({ error: "Erro ao salvar dados operacionais." }, { status: 503 });
    }

    return NextResponse.json({ error: "Erro interno ao salvar os dados operacionais." }, { status: 500 });
  }
}
