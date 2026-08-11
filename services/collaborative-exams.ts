import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { CollaborativeExam, CollaborativeExamSection, ExamSectionStatus } from "@/types/collaborative-exams";

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Banco de dados não configurado.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function ensure(error: { message?: string } | null) {
  if (error) throw new Error(error.message || "Erro ao acessar a prova.");
}

function section(row: Record<string, unknown>): CollaborativeExamSection {
  const questionStart = Number(row.question_start);
  const questionCount = Number(row.question_count);
  return { id: String(row.id), examId: String(row.exam_id), subject: String(row.subject), teacherId: String(row.teacher_id), teacherName: String(row.teacher_name), questionStart, questionCount, questionEnd: questionStart + questionCount - 1, status: String(row.status) as ExamSectionStatus, reviewNote: String(row.review_note || ""), submittedAt: row.submitted_at ? String(row.submitted_at) : null, reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null, reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null };
}

export async function listTeachers() {
  const { data, error } = await db().from("app_users").select("legacy_id,full_name").eq("role", "professor").eq("active", true).order("full_name");
  ensure(error);
  return (data ?? []).map((item) => ({ id: String(item.legacy_id), name: String(item.full_name) }));
}

export async function listCollaborativeExams(teacherId?: string): Promise<CollaborativeExam[]> {
  const client = db();
  const sectionsQuery = client.from("exam_sections").select("*").order("question_start");
  if (teacherId) sectionsQuery.eq("teacher_id", teacherId);
  const { data: sections, error: sectionsError } = await sectionsQuery;
  ensure(sectionsError);
  const ids = [...new Set((sections ?? []).map((item) => String(item.exam_id)))];
  if (!ids.length) return [];
  const { data: exams, error } = await client.from("exams").select("id,title,audience_label,alternatives,exam_date,question_count,released_at").in("id", ids).order("exam_date", { ascending: false });
  ensure(error);
  const { data: answerKeys, error: answersError } = await client.from("answer_keys").select("exam_id,question_number,correct_answer").in("exam_id", ids).order("question_number");
  ensure(answersError);
  const answersByExam = new Map<string, Map<number, string>>();
  for (const item of answerKeys ?? []) {
    const answers = answersByExam.get(String(item.exam_id)) ?? new Map<number, string>();
    answers.set(Number(item.question_number), String(item.correct_answer));
    answersByExam.set(String(item.exam_id), answers);
  }
  const grouped = new Map<string, CollaborativeExamSection[]>();
  for (const item of sections ?? []) {
    const value = section(item as Record<string, unknown>);
    value.answers = Array.from({ length: value.questionCount }, (_, index) => answersByExam.get(value.examId)?.get(value.questionStart + index) ?? "");
    grouped.set(value.examId, [...(grouped.get(value.examId) ?? []), value]);
  }
  return (exams ?? []).map((item) => ({ id: String(item.id), title: String(item.title), audienceLabel: String(item.audience_label), alternatives: Array.isArray(item.alternatives) ? item.alternatives.map(String) : [], examDate: String(item.exam_date), questionCount: Number(item.question_count), releasedAt: item.released_at ? String(item.released_at) : null, sections: grouped.get(String(item.id)) ?? [] }));
}

export async function createCollaborativeExam(input: { title: string; audienceId: string; audienceLabel: string; groupType: string; yearSegment: string; alternatives: string[]; examDate: string; sections: Array<{ subject: string; teacherId: string; questionCount: number }> }) {
  const assignedTeacherIds = input.sections.map((item) => item.teacherId);
  if (new Set(assignedTeacherIds).size !== assignedTeacherIds.length) throw new Error("Um professor pode receber apenas uma matéria por prova.");
  const teachers = new Map((await listTeachers()).map((item) => [item.id, item.name]));
  let offset = 1;
  const normalized = input.sections.map((item) => {
    const teacherName = teachers.get(item.teacherId);
    if (!teacherName) throw new Error("Professor responsável inválido.");
    const result = { ...item, teacherName, questionStart: offset };
    offset += item.questionCount;
    return result;
  });
  const client = db();
  const examId = crypto.randomUUID();
  const code = `${input.title.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 12) || "PROVA"}-${input.examDate.slice(0, 4)}`;
  const { error } = await client.from("exams").insert({ id: examId, title: input.title, audience_id: input.audienceId, audience_label: input.audienceLabel, group_type: input.groupType, year_segment: input.yearSegment, question_count: offset - 1, alternatives: input.alternatives, exam_date: input.examDate, code, template_version: "PS-CARD-3" });
  ensure(error);
  const { error: sectionError } = await client.from("exam_sections").insert(normalized.map((item) => ({ id: crypto.randomUUID(), exam_id: examId, subject: item.subject, teacher_id: item.teacherId, teacher_name: item.teacherName, question_start: item.questionStart, question_count: item.questionCount })));
  ensure(sectionError);
  const { error: keyError } = await client.from("answer_keys").insert(Array.from({ length: offset - 1 }, (_, index) => ({ exam_id: examId, question_number: index + 1, correct_answer: input.alternatives[0] })));
  ensure(keyError);
  return examId;
}

export async function getTeacherSection(examId: string, sectionId: string, teacherId: string) {
  const { data, error } = await db().from("exam_sections").select("*").eq("id", sectionId).eq("exam_id", examId).eq("teacher_id", teacherId).maybeSingle();
  ensure(error);
  return data ? section(data as Record<string, unknown>) : null;
}

export async function saveSectionAnswers(input: { examId: string; sectionId: string; teacherId: string; answers: string[]; submit: boolean }) {
  const current = await getTeacherSection(input.examId, input.sectionId, input.teacherId);
  if (!current) throw new Error("Bloco não encontrado para este professor.");
  if (current.status === "enviado" || current.status === "aprovado") throw new Error("Este bloco está bloqueado para edição.");
  if (input.answers.length !== current.questionCount || input.answers.some((item) => !item.trim())) throw new Error("Preencha todas as respostas do bloco.");
  const client = db();
  const { data: exam, error: examError } = await client.from("exams").select("alternatives").eq("id", input.examId).single();
  ensure(examError);
  if (!exam) throw new Error("Prova não encontrada.");
  const alternatives = Array.isArray(exam.alternatives) ? exam.alternatives.map(String) : [];
  if (input.answers.some((item) => !alternatives.includes(item))) throw new Error("Alternativa inválida.");
  const { error } = await client.from("answer_keys").upsert(input.answers.map((answer, index) => ({ exam_id: input.examId, question_number: current.questionStart + index, correct_answer: answer })), { onConflict: "exam_id,question_number" });
  ensure(error);
  const { error: updateError } = await client.from("exam_sections").update(input.submit ? { status: "enviado", submitted_at: new Date().toISOString(), review_note: "", reviewed_at: null, reviewed_by: null } : { status: "rascunho" }).eq("id", current.id);
  ensure(updateError);
  return current;
}

export async function reviewSection(input: { examId: string; sectionId: string; approved: boolean; note: string; reviewerId: string }) {
  const client = db();
  const { data, error } = await client.from("exam_sections").select("*").eq("id", input.sectionId).eq("exam_id", input.examId).maybeSingle();
  ensure(error);
  if (!data) throw new Error("Bloco não encontrado.");
  if (data.status !== "enviado") throw new Error("Somente blocos enviados podem ser revisados.");
  if (!input.approved && !input.note.trim()) throw new Error("Explique ao professor o ajuste necessário.");
  const { error: updateError } = await client.from("exam_sections").update({ status: input.approved ? "aprovado" : "devolvido", review_note: input.note.trim(), reviewed_at: new Date().toISOString(), reviewed_by: input.reviewerId }).eq("id", input.sectionId);
  ensure(updateError);
}

export async function releaseExam(examId: string) {
  const client = db();
  const { data, error } = await client.from("exam_sections").select("status").eq("exam_id", examId);
  ensure(error);
  if (!data?.length || data.some((item) => item.status !== "aprovado")) throw new Error("Todos os blocos devem estar aprovados antes da liberação.");
  const { error: updateError } = await client.from("exams").update({ released_at: new Date().toISOString() }).eq("id", examId);
  ensure(updateError);
}

export async function deleteCollaborativeExam(examId: string) {
  const { data, error } = await db().rpc("delete_collaborative_exam", { p_exam_id: examId });
  ensure(error);
  if (!data) throw new Error("Prova colaborativa não encontrada.");
}
