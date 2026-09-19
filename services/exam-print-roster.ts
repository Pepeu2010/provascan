import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getTeacherExam } from "@/services/teacher-exams";
import type { ExamPrintStudent } from "@/lib/exam-print-document";

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Banco de dados não configurado.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function ensure(error: { message?: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

/**
 * A lista é resolvida no servidor depois de validar a prova e a sessão. IDs de
 * aluno enviados pelo navegador nunca definem quem receberá um cartão.
 */
export async function getExamPrintRoster(input: { actorId: string; examId: string; institutionalView: boolean }) {
  const exam = await getTeacherExam(input);
  if (!exam) return null;
  const client = db();
  const { data: assignments, error: assignmentError } = await client
    .from("exam_assignments")
    .select("class_id")
    .eq("exam_id", exam.id)
    .eq("active", true)
    .is("archived_at", null);
  ensure(assignmentError, "Não foi possível carregar as turmas da prova.");

  let classIds = [...new Set((assignments ?? []).map((item) => String(item.class_id)))];
  if (!classIds.length) {
    let classQuery = client.from("classes").select("id,name,year_segment,audience_id").order("name");
    if (exam.groupType === "TURMA" && exam.audienceId) classQuery = classQuery.eq("audience_id", exam.audienceId);
    else if (exam.yearSegment && exam.yearSegment !== "OUTROS") classQuery = classQuery.eq("year_segment", exam.yearSegment);
    const { data: legacyClasses, error: classError } = await classQuery;
    ensure(classError, "Não foi possível carregar as turmas da prova.");
    classIds = (legacyClasses ?? []).map((item) => String(item.id));
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
