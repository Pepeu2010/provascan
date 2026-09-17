import "server-only";

import { createClient } from "@supabase/supabase-js";
import { canAssignPair, expandAssignmentGroups, type AssignmentGroup, type AssignmentPair } from "@/lib/exam-assignment-policy";
import { isPrivilegedRole } from "@/lib/access-control";
import { canActOnExamScope } from "@/services/pedagogical-scopes";
import type { UserRole } from "@/types/auth";
import type { ExamAssignment } from "@/types/exam-assignments";

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Banco de dados não configurado.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
function ensure(error: { message?: string } | null, fallback: string) { if (error) throw new Error(error.message || fallback); }
function key(pair: AssignmentPair) { return `${pair.teacherId}:${pair.classId}`; }
function map(row: Record<string, unknown>): ExamAssignment { return { active: Boolean(row.active), archivedAt: row.archived_at ? String(row.archived_at) : null, classId: String(row.class_id), examId: String(row.exam_id), id: String(row.id), teacherId: String(row.teacher_id) }; }

export async function listExamAssignments(examId: string, includeInactive = false): Promise<ExamAssignment[]> {
  let query = db().from("exam_assignments").select("id,exam_id,teacher_id,class_id,active,archived_at").eq("exam_id", examId).order("assigned_at");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  ensure(error, "Não foi possível carregar as atribuições.");
  return (data ?? []).map((row) => map(row as Record<string, unknown>));
}

async function validatePairs(input: { actorId: string; actorRole: UserRole; examId: string; groups: AssignmentGroup[]; justification?: string }) {
  const pairs = expandAssignmentGroups(input.groups);
  const client = db();
  const [{ data: exam, error: examError }, { data: users, error: userError }, { data: classes, error: classError }] = await Promise.all([
    client.from("exams").select("id,subject_id,creator_id").eq("id", input.examId).maybeSingle(),
    client.from("app_users").select("legacy_id,active").in("legacy_id", [...new Set(pairs.map((pair) => pair.teacherId))]),
    client.from("classes").select("id").in("id", [...new Set(pairs.map((pair) => pair.classId))]),
  ]);
  ensure(examError, "Não foi possível localizar a prova.");
  if (!exam) throw new Error("Prova não encontrada.");
  if (input.actorRole === "professor" && String(exam.creator_id) !== input.actorId) throw new Error("Você não pode alterar atribuições de uma prova de outro professor.");
  ensure(userError, "Não foi possível validar os professores.");
  ensure(classError, "Não foi possível validar as turmas.");
  const activeUsers = new Set((users ?? []).filter((user) => Boolean(user.active)).map((user) => String(user.legacy_id)));
  const validClasses = new Set((classes ?? []).map((item) => String(item.id)));
  const subjectId = exam.subject_id ? String(exam.subject_id) : "";
  for (const pair of pairs) {
    if (!activeUsers.has(pair.teacherId)) throw new Error("O professor responsável precisa estar ativo.");
    if (!validClasses.has(pair.classId)) throw new Error("A turma selecionada não existe.");
    const actorScope = subjectId ? await canActOnExamScope({ classId: pair.classId, role: input.actorRole, subjectId, userId: input.actorId }) : true;
    const teacherScope = subjectId ? await canActOnExamScope({ classId: pair.classId, role: "professor", subjectId, userId: pair.teacherId }) : true;
    const scopeException = Boolean(input.justification?.trim());
    if (!canAssignPair({ actorId: input.actorId, actorRole: input.actorRole, destinationHasScope: teacherScope, destinationTeacherId: pair.teacherId, hasScope: actorScope, scopeException })) throw new Error("Seu perfil não pode atribuir esta prova para esta turma.");
  }
  return pairs;
}

export async function syncExamAssignments(input: { actorId: string; actorRole: UserRole; examId: string; groups: AssignmentGroup[]; justification?: string }) {
  const desired = await validatePairs(input);
  const current = await listExamAssignments(input.examId, true);
  const desiredKeys = new Set(desired.map(key));
  const active = current.filter((item) => item.active);
  const now = new Date().toISOString();
  const client = db();
  const toArchive = active.filter((item) => !desiredKeys.has(key(item)));
  const { data: exam, error: examError } = await client.from("exams").select("subject_id,creator_id").eq("id", input.examId).maybeSingle();
  ensure(examError, "Não foi possível validar a prova.");
  if (!exam) throw new Error("Prova não encontrada.");
  if (input.actorRole === "professor" && String(exam.creator_id) !== input.actorId) throw new Error("Você não pode inativar atribuições de uma prova de outro professor.");
  const subjectId = exam.subject_id ? String(exam.subject_id) : "";
  for (const item of toArchive) {
    if (isPrivilegedRole(input.actorRole) || !subjectId) continue;
    const hasScope = await canActOnExamScope({ classId: item.classId, role: input.actorRole, subjectId, userId: input.actorId });
    if (!hasScope) throw new Error("Você não pode inativar uma atribuição fora do seu escopo pedagógico.");
  }
  for (const item of toArchive) ensure((await client.from("exam_assignments").update({ active: false, archived_at: now }).eq("id", item.id).eq("active", true)).error, "Não foi possível inativar a atribuição.");
  for (const pair of desired) {
    const previous = current.find((item) => key(item) === key(pair));
    if (previous?.active) continue;
    if (previous) ensure((await client.from("exam_assignments").update({ active: true, archived_at: null, assigned_by: input.actorId }).eq("id", previous.id).eq("active", false)).error, "Não foi possível reativar a atribuição.");
    else ensure((await client.from("exam_assignments").insert({ active: true, assigned_at: now, assigned_by: input.actorId, archived_at: null, class_id: pair.classId, exam_id: input.examId, id: crypto.randomUUID(), teacher_id: pair.teacherId })).error, "Não foi possível criar a atribuição.");
  }
  return listExamAssignments(input.examId, true);
}
