import "server-only";

import { createSheetsClient } from "@/lib/sheets-compat";
import { getTeacherExam } from "@/services/teacher-exams";
import { getActiveAssignedExamClasses } from "@/services/assigned-exam-access";
import { restrictRosterClassIds, selectLegacyRosterClassIds } from "@/lib/exam-roster-scope";
import { scopeAllowsExam } from "@/lib/pedagogical-scope-match";
import type { ExamPrintStudent } from "@/lib/exam-print-document";

function db() {
  return createSheetsClient();
}

function ensure(error: { message?: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

/**
 * A lista é resolvida no servidor depois de validar a prova e a sessão. IDs de
 * aluno enviados pelo navegador nunca definem quem receberá um cartão.
 */
export async function getExamPrintRoster(input: { actorId: string; examId: string; institutionalView: boolean }) {
  const exam = await getTeacherExam({ ...input, allowAssignedRead: true });
  if (!exam) return null;
  const client = db();
  const { data: assignments, error: assignmentError } = await client
    .from("exam_assignments")
    .select("class_id")
    .eq("exam_id", exam.id)
    .eq("active", true)
    .is("archived_at", null);
  ensure(assignmentError, "Não foi possível carregar as turmas da prova.");

  const assignedTeacher = !input.institutionalView && exam.creatorId !== input.actorId;
  let classIds = assignedTeacher
    ? [...(await getActiveAssignedExamClasses(input.actorId, exam.id)).get(exam.id) ?? []]
    : [...new Set((assignments ?? []).map((item) => String(item.class_id)))];
  if (!classIds.length && !assignedTeacher) {
    const { data: legacyClasses, error: classError } = await client.from("classes").select("id,year_segment,audience_id");
    ensure(classError, "Não foi possível carregar as turmas da prova.");
    classIds = selectLegacyRosterClassIds(exam, (legacyClasses ?? []).map((item) => ({
      audienceId: String(item.audience_id ?? ""),
      id: String(item.id),
      yearSegment: String(item.year_segment ?? ""),
    })));
  }
  if (!input.institutionalView) {
    const { data: scopeRows, error: scopeError } = await client.from("pedagogical_scopes")
      .select("class_id,subject_id,active,archived_at")
      .eq("user_id", input.actorId)
      .eq("active", true)
      .is("archived_at", null);
    ensure(scopeError, "Não foi possível validar as turmas autorizadas.");
    const allowed = new Set((scopeRows ?? [])
      .filter((item) => scopeAllowsExam({
        active: Boolean(item.active),
        archived_at: item.archived_at == null ? null : String(item.archived_at),
        class_id: String(item.class_id),
        subject_id: item.subject_id == null ? null : String(item.subject_id),
      }, String(item.class_id), exam.subjectId ?? null))
      .map((item) => String(item.class_id)));
    classIds = restrictRosterClassIds(classIds, allowed);
  }
  if (!classIds.length) return { exam, students: [] satisfies ExamPrintStudent[] };

  const [{ data: classRows, error: classError }, { data: studentRows, error: studentError }] = await Promise.all([
    client.from("classes").select("id,name").in("id", classIds),
    client.from("students").select("id,name,class_id,status").in("class_id", classIds).eq("status", "Ativo"),
  ]);
  ensure(classError, "Não foi possível carregar as turmas.");
  ensure(studentError, "Não foi possível carregar os alunos.");
  const classNames = new Map((classRows ?? []).map((item) => [String(item.id), String(item.name)]));
  const students = (studentRows ?? []).map((item) => ({
    className: classNames.get(String(item.class_id)) ?? "Turma",
    id: String(item.id),
    name: String(item.name),
  })).sort((left, right) => left.className.localeCompare(right.className, "pt-BR", { numeric: true }) || left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" }));
  return { exam, students };
}
