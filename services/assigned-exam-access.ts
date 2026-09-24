import "server-only";

import { createClient } from "@supabase/supabase-js";
import { selectActiveAssignedExamClasses, type AssignedExamDetails, type AssignedExamRow, type AssignedScopeRow } from "@/lib/assigned-exam-access";

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Banco de dados não configurado.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function isMissingAssignmentTable(error: { code?: string; message?: string } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205" || /exam_assignments.*(?:does not exist|schema cache)/i.test(error?.message ?? "");
}

/** During the additive migration, an older database keeps the legacy owner
 * path available; it never infers a new permission from legacy sections. */
export async function getActiveAssignedExamClasses(teacherId: string, examId?: string) {
  const client = db();
  let query = client.from("exam_assignments")
    .select("exam_id,class_id,active,archived_at")
    .eq("teacher_id", teacherId)
    .eq("active", true)
    .is("archived_at", null);
  if (examId) query = query.eq("exam_id", examId);
  const { data: assignments, error: assignmentError } = await query;
  if (isMissingAssignmentTable(assignmentError)) return new Map<string, Set<string>>();
  if (assignmentError) throw new Error(assignmentError.message || "Não foi possível validar as atribuições.");
  if (!assignments?.length) return new Map<string, Set<string>>();
  const examIds = [...new Set(assignments.map((row) => String(row.exam_id)))];
  const [{ data: exams, error: examError }, { data: scopes, error: scopeError }] = await Promise.all([
    client.from("exams").select("id,subject_id,status").in("id", examIds),
    client.from("pedagogical_scopes").select("class_id,subject_id,active,archived_at").eq("user_id", teacherId).eq("active", true).is("archived_at", null),
  ]);
  if (examError || scopeError) throw new Error(examError?.message || scopeError?.message || "Não foi possível validar o escopo da prova.");
  return selectActiveAssignedExamClasses(
    assignments as AssignedExamRow[],
    (scopes ?? []) as AssignedScopeRow[],
    (exams ?? []) as AssignedExamDetails[],
  );
}
