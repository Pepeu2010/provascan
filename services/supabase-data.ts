import "server-only";

import { createClient } from "@supabase/supabase-js";
import { compare } from "bcryptjs";
import { z } from "zod";
import { cloneDefaultAppData, type AppDataState } from "@/lib/app-data";
import { normalizeClasses } from "@/lib/exam-audience";
import { classes, correctionSessions, exams, students } from "@/lib/mock-data";
import type { ClassRoom, CorrectionSession, Exam, ExamCorrectionRule, Student, TeacherProfile } from "@/types/domain";
import type { UserRecord } from "@/types/auth";

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});

export class SupabaseConfigError extends Error {}
export class SupabaseConnectionError extends Error {}
export class SupabaseSchemaError extends Error {}

function client() {
  const parsed = envSchema.safeParse({ SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY });
  if (!parsed.success) throw new SupabaseConfigError("Supabase não configurado.");
  return createClient(parsed.data.SUPABASE_URL, parsed.data.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function dbError(error: { message?: string } | null) {
  if (error) {
    console.error("Supabase database request failed", { message: error.message ?? "unknown" });
    throw new SupabaseConnectionError("Erro ao acessar os dados do sistema.");
  }
}

function flag(value: string | boolean | null | undefined) {
  return value === true || String(value ?? "").trim().toUpperCase() === "SIM" || String(value ?? "").trim().toUpperCase() === "ATIVO";
}

function toDate(value: string | null) { return value || ""; }

type DbUser = {
  legacy_id: string; access_key: string; full_name: string; role: string; subject: string; password_hash: string;
  active: boolean; force_password_change: boolean; mfa_active: boolean; mfa_method: string; mfa_secret_encrypted: string;
  recovery_codes_hashes: string[]; sessions_revoked_at: string | null;
};

function mapUser(row: DbUser): UserRecord {
  return {
    id: row.legacy_id, nome: row.full_name, email: row.access_key, senha: row.password_hash, senha_formato: "BCRYPT",
    perfil: row.role, disciplina: row.subject, ativo: row.active ? "SIM" : "NAO", trocar_senha: row.force_password_change ? "SIM" : "NAO",
    mfa_ativo: row.mfa_active ? "SIM" : "NAO", mfa_metodo: row.mfa_method === "TOTP" ? "TOTP" : "",
    mfa_secret_encrypted: row.mfa_secret_encrypted, recovery_codes_configurados: row.recovery_codes_hashes.length ? "SIM" : "NAO",
    recovery_codes_hashes: JSON.stringify(row.recovery_codes_hashes), sessao_revogada_em: toDate(row.sessions_revoked_at),
  };
}

export function isActiveUser(value: string) { return flag(value); }
export function shouldForcePasswordChange(value: string) { return flag(value); }

export async function getUserByEmail(access: string) {
  const { data, error } = await client().from("app_users").select("*").eq("access_key", access.trim().toLowerCase()).maybeSingle();
  dbError(error);
  return data ? mapUser(data as DbUser) : null;
}
export const getUserByAccess = getUserByEmail;
export const getUserAuthState = getUserByEmail;

async function updateUser(userId: string, values: Record<string, unknown>) {
  const { error } = await client().from("app_users").update(values).eq("legacy_id", userId);
  dbError(error);
}

export async function updateUserPassword(userId: string, passwordHash: string, options?: { clearPasswordChangeFlag?: boolean }) {
  await updateUser(userId, { password_hash: passwordHash, force_password_change: !options?.clearPasswordChangeFlag, password_changed_at: new Date().toISOString() });
}
export async function updateMfaMethod(userId: string, method: "TOTP") { await updateUser(userId, { mfa_method: method }); }
export async function markMfaEnabled(userId: string) { await updateUser(userId, { mfa_active: true, mfa_configured_at: new Date().toISOString(), last_mfa_at: new Date().toISOString(), sessions_revoked_at: new Date().toISOString() }); }
export async function updateLastMfa(userId: string) { await updateUser(userId, { last_mfa_at: new Date().toISOString(), mfa_failures: 0 }); }
export async function updateLastLogin(userId: string) { await updateUser(userId, { last_login_at: new Date().toISOString() }); }
export async function storeEncryptedTotpSecret(userId: string, secret: string) { await updateUser(userId, { mfa_secret_encrypted: secret }); }
export async function storeRecoveryCodeHashes(userId: string, hashes: string) { await updateUser(userId, { recovery_codes_hashes: JSON.parse(hashes) as string[] }); }
export async function revokeUserSessions(userId: string) { await updateUser(userId, { sessions_revoked_at: new Date().toISOString() }); }
export async function disableUserMfa(userId: string) { await updateUser(userId, { mfa_active: false, mfa_method: "", mfa_secret_encrypted: "", recovery_codes_hashes: [], sessions_revoked_at: new Date().toISOString() }); }
export const resetUserMfaByAdministration = disableUserMfa;
export async function completeTotpSetup(userId: string, input: { encryptedSecret: string; recoveryCodeHashes: string }) {
  await updateUser(userId, { mfa_active: true, mfa_method: "TOTP", mfa_secret_encrypted: input.encryptedSecret, recovery_codes_hashes: JSON.parse(input.recoveryCodeHashes) as string[], mfa_configured_at: new Date().toISOString(), last_mfa_at: new Date().toISOString(), sessions_revoked_at: new Date().toISOString() });
}
export async function consumeRecoveryCode(userId: string, code: string) {
  const user = await getUserByAccess((await client().from("app_users").select("access_key").eq("legacy_id", userId).maybeSingle()).data?.access_key ?? "");
  if (!user) return false;
  const hashes = JSON.parse(user.recovery_codes_hashes || "[]") as string[];
  const index = await (async () => { for (let i = 0; i < hashes.length; i += 1) if (await compare(code, hashes[i])) return i; return -1; })();
  if (index < 0) return false;
  await updateUser(userId, { recovery_codes_hashes: hashes.filter((_, i) => i !== index) });
  return true;
}
export async function updateUserPasswordChangeFlag(userId: string, shouldForce: boolean) { await updateUser(userId, { force_password_change: shouldForce }); }
export async function updateAllUsersPasswordChangeFlag(shouldForce: boolean) { const { data, error } = await client().from("app_users").update({ force_password_change: shouldForce }).select("legacy_id"); dbError(error); return { updated: data?.length ?? 0 }; }
export async function migrateUsersSecuritySchema() { return { addedHeaders: [] as string[], auditCreated: true, usersTab: "Supabase" }; }
export async function listUsersForAdmin() {
  const { data, error } = await client().from("app_users").select("legacy_id,access_key,full_name,role,subject,active,force_password_change").order("full_name");
  dbError(error);
  return (data ?? []).map((row) => ({ id: row.legacy_id, nome: row.full_name, email: row.access_key, perfil: row.role, disciplina: row.subject, ativo: row.active ? "SIM" : "NAO", trocar_senha: row.force_password_change ? "SIM" : "NAO" }));
}

export async function appendAuditEvent(input: { actorId: string; event: string; targetId?: string; ipHash?: string; metadata?: Record<string, string | number | boolean> }) {
  const { error } = await client().from("audit_log_internal").insert({ id: crypto.randomUUID(), occurred_at: new Date().toISOString(), actor_id: input.actorId, event: input.event, target_id: input.targetId ?? "", ip_hash: input.ipHash ?? "", metadata: input.metadata ?? {} });
  dbError(error);
}

function teacherProfile(rows: Array<{ key: string; value: string }>): TeacherProfile {
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const fallback = cloneDefaultAppData().teacherProfile;
  return { nome: values.get("teacher_nome") || fallback.nome, email: values.get("teacher_email") || fallback.email, escola: values.get("teacher_escola") || fallback.escola };
}

export async function getOperationalAppData(): Promise<AppDataState> {
  const db = client();
  const [classResult, studentResult, examResult, keyResult, ruleResult, correctionResult, settingsResult] = await Promise.all([
    db.from("classes").select("*"), db.from("students").select("*"), db.from("exams").select("*"), db.from("answer_keys").select("*"), db.from("correction_rules").select("*"), db.from("corrections").select("*"), db.from("app_settings_internal").select("key,value"),
  ]);
  [classResult, studentResult, examResult, keyResult, ruleResult, correctionResult, settingsResult].forEach((result) => dbError(result.error));
  const storedClasses = ((classResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({ id: String(row.id), nome: String(row.name), professor: String(row.teacher), ano: String(row.academic_year), periodo: String(row.period), audienceId: String(row.audience_id || "") || undefined, audienceLabel: String(row.audience_label || "") || undefined, groupType: String(row.group_type || "") || undefined, yearSegment: String(row.year_segment || "") || undefined })) as ClassRoom[];
  const normalizedClasses = normalizeClasses(storedClasses);
  return {
    classes: normalizedClasses,
    students: ((studentResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({ id: String(row.id), nome: String(row.name), turma: String(row.class_id ?? ""), matricula: String(row.registration ?? ""), status: String(row.status ?? "Ativo") })) as Student[],
    exams: ((examResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({ id: String(row.id), titulo: String(row.title), subject: String(row.subject), audienceId: String(row.audience_id), audienceLabel: String(row.audience_label), groupType: String(row.group_type) as Exam["groupType"], yearSegment: String(row.year_segment) as Exam["yearSegment"], quantidadeQuestoes: Number(row.question_count), alternativas: Array.isArray(row.alternatives) ? row.alternatives.map(String) : [], data: String(row.exam_date), codigo: String(row.code), templateVersion: String(row.template_version) })) as Exam[],
    answerKeys: ((keyResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({ provaId: String(row.exam_id), questao: Number(row.question_number), respostaCorreta: String(row.correct_answer) })),
    correctionRules: ((ruleResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({ provaId: String(row.exam_id), notaMaxima: Number(row.max_score), arredondamentoCasas: Number(row.rounding_places), pesoPadrao: Number(row.default_weight), pesosPorQuestao: Array.isArray(row.weights_by_question) ? row.weights_by_question : [], questoesAnuladas: Array.isArray(row.voided_questions) ? row.voided_questions.map(Number) : [], modoQuestaoAnulada: String(row.voided_question_mode) as ExamCorrectionRule["modoQuestaoAnulada"] })),
    corrections: ((correctionResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({ correction: { id: String(row.id), provaId: String(row.exam_id), alunoId: String(row.student_id ?? ""), nomeDetectado: String(row.detected_name), nota: Number(row.score), acertos: Number(row.correct_count), erros: Number(row.incorrect_count), emBranco: Number(row.blank_count), multiplasMarcacoes: Number(row.multiple_marks_count), anuladas: Number(row.voided_count), percentual: Number(row.percentage), data: String(row.corrected_at), imagem: String(row.source_image), tempoCorrecao: String(row.correction_time), metodoIdentificacao: String(row.identification_method) as CorrectionSession["correction"]["metodoIdentificacao"] }, aluno: row.student_snapshot as Student, prova: row.exam_snapshot as Exam, turma: row.class_snapshot as ClassRoom, respostas: (row.answers as CorrectionSession["respostas"]) ?? [], confiancaOcr: Number(row.ocr_confidence), imagemProcessada: String(row.processed_image), observacoes: (row.observations as string[]) ?? [], identificacao: row.identification as CorrectionSession["identificacao"] })) as CorrectionSession[],
    teacherProfile: teacherProfile((settingsResult.data ?? []) as Array<{ key: string; value: string }>),
  };
}

export async function getOperationalRevision() { const { data, error } = await client().from("operational_meta_internal").select("revision").eq("singleton", true).maybeSingle(); dbError(error); return String(data?.revision ?? 0); }
export async function getOperationalSnapshot() { const [data, revision] = await Promise.all([getOperationalAppData(), getOperationalRevision()]); return { data, revision }; }
export async function saveOperationalAppData(data: AppDataState, metadata?: { actorId: string; revision: string }) {
  const { data: revision, error } = await client().rpc("replace_operational_state", { payload: data, actor_id: metadata?.actorId ?? "system", expected_revision: Number(metadata?.revision ?? 0) });
  dbError(error); return String(revision);
}
export async function getSchoolRoster() { const data = await getOperationalAppData(); return { classes: data.classes, students: data.students }; }
export async function getUsersSheetHealth() { const { count, error } = await client().from("app_users").select("legacy_id", { count: "exact", head: true }); dbError(error); return { usersCount: count ?? 0, status: { configured: true, mode: "supabase" as const, studentsTab: "Supabase", usersTab: "Supabase" } }; }
export async function getSystemSnapshot() { const [health, data] = await Promise.all([getUsersSheetHealth(), getOperationalAppData()]); return { status: health.status, totals: { alunos: data.students.length, turmas: data.classes.length, provas: data.exams.length, correcoes: data.corrections.length, usuarios: health.usersCount } }; }
export function getSheetsStatus() { return { configured: Boolean(process.env.SUPABASE_URL), mode: "supabase" as const, studentsTab: "Supabase", usersTab: "Supabase" }; }
export const fallbackTotals = { alunos: students.length, turmas: classes.length, provas: exams.length, correcoes: correctionSessions.length };
