import "server-only";

import { createClient } from "@supabase/supabase-js";
import { canActInPedagogicalScope } from "@/lib/pedagogical-scope-policy";
import { scopeAllowsExam } from "@/lib/pedagogical-scope-match";
import type { UserRole } from "@/types/auth";
import type { PedagogicalScope, Subject } from "@/types/pedagogical-scopes";

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Banco de dados não configurado.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function ensure(error: { message?: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

export async function listSubjects(includeInactive = false): Promise<Subject[]> {
  let query = db().from("subjects").select("id,name,active").order("name").limit(500);
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  ensure(error, "Não foi possível carregar as disciplinas.");
  return (data ?? []).map((row) => ({ active: Boolean(row.active), id: String(row.id), name: String(row.name) }));
}

export async function resolveSubjectSnapshot(subjectId: string) {
  const { data, error } = await db().from("subjects").select("id,name,active").eq("id", subjectId).maybeSingle();
  ensure(error, "Não foi possível localizar a disciplina.");
  if (!data || !data.active) throw new Error("A disciplina selecionada não está disponível.");
  return { id: String(data.id), name: String(data.name) };
}

export async function listPedagogicalScopes(userId: string): Promise<PedagogicalScope[]> {
  const { data, error } = await db()
    .from("pedagogical_scopes")
    .select("id,user_id,subject_id,class_id,active,archived_at")
    .eq("user_id", userId)
    .order("granted_at", { ascending: false })
    .limit(1000);
  ensure(error, "Não foi possível carregar os escopos pedagógicos.");
  return (data ?? []).map((row) => ({
    active: Boolean(row.active),
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    classId: String(row.class_id),
    id: String(row.id),
    subjectId: row.subject_id === null ? null : String(row.subject_id),
    userId: String(row.user_id),
  }));
}

export async function canActOnExamScope(input: { classId: string; role: UserRole; subjectId: string; userId: string }) {
  if (canActInPedagogicalScope(input.role, false)) return true;
  const { data, error } = await db()
    .from("pedagogical_scopes")
    .select("id,class_id,subject_id,active,archived_at")
    .eq("user_id", input.userId)
    .eq("class_id", input.classId)
    .eq("active", true)
    .is("archived_at", null);
  ensure(error, "Não foi possível validar o escopo pedagógico.");
  return (data ?? []).some((row) => scopeAllowsExam(row, input.classId, input.subjectId));
}

/**
 * A prova pode ter uma disciplina escrita livremente. Nesse caso, não existe
 * uma chave de disciplina para consultar: a autorização continua sendo feita
 * no servidor pelo vínculo ativo entre a pessoa e a turma.
 */
export async function canActOnClassScope(input: { classId: string; role: UserRole; userId: string }) {
  if (canActInPedagogicalScope(input.role, false)) return true;
  const { data, error } = await db()
    .from("pedagogical_scopes")
    .select("id")
    .eq("user_id", input.userId)
    .eq("class_id", input.classId)
    .eq("active", true)
    .is("archived_at", null)
    .limit(1);
  ensure(error, "Não foi possível validar o acesso à turma.");
  return Boolean(data?.length);
}
