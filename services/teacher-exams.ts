import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { TeacherExam, TeacherExamInput, TeacherExamQuestion } from "@/types/teacher-exams";

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Banco de dados não configurado.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function ensure(error: { message?: string } | null, fallback = "Erro ao acessar as provas.") {
  if (error) throw new Error(error.message || fallback);
}

function mapQuestion(row: Record<string, unknown>): TeacherExamQuestion {
  return {
    alternatives: Array.isArray(row.alternatives) ? row.alternatives.map(String) : [],
    annulled: Boolean(row.annulled),
    correctAnswers: Array.isArray(row.correct_answers) ? row.correct_answers.map(String) : [],
    correctionCriteria: String(row.correction_criteria || ""),
    correctionNotes: String(row.correction_notes || ""),
    id: String(row.id),
    imagePath: row.image_path ? String(row.image_path) : null,
    needsReview: Boolean(row.needs_review),
    position: Number(row.position),
    prompt: String(row.prompt || ""),
    type: String(row.type) as TeacherExamQuestion["type"],
    weight: Number(row.weight),
  };
}

const examColumns = [
  "id", "title", "description", "subject", "audience_id", "audience_label", "group_type", "year_segment", "period",
  "exam_date", "instructions", "estimated_duration", "creator_id", "source_type", "status", "original_file_name",
  "original_file_mime_type", "original_file_size", "imported_at", "import_processing_status", "import_processing_error",
  "needs_review", "version", "created_at", "updated_at", "published_at", "applied_at", "legacy_contributors",
].join(",");

async function hydrate(rows: Array<Record<string, unknown>>): Promise<TeacherExam[]> {
  if (!rows.length) return [];
  const client = db();
  const ids = rows.map((row) => String(row.id));
  const creatorIds = [...new Set(rows.map((row) => String(row.creator_id)))];
  const [{ data: questions, error: questionError }, { data: users, error: userError }, { data: corrections, error: correctionError }] = await Promise.all([
    client.from("exam_questions").select("*").in("exam_id", ids).order("position"),
    client.from("app_users").select("legacy_id,full_name").in("legacy_id", creatorIds),
    client.from("corrections").select("exam_id").in("exam_id", ids),
  ]);
  ensure(questionError);
  ensure(userError);
  ensure(correctionError);
  const creatorNames = new Map((users ?? []).map((row) => [String(row.legacy_id), String(row.full_name)]));
  const resultIds = new Set((corrections ?? []).map((row) => String(row.exam_id)));
  const groupedQuestions = new Map<string, TeacherExamQuestion[]>();
  for (const raw of questions ?? []) {
    const row = raw as Record<string, unknown>;
    const examId = String(row.exam_id);
    groupedQuestions.set(examId, [...(groupedQuestions.get(examId) ?? []), mapQuestion(row)]);
  }
  return rows.map((row) => {
    const id = String(row.id);
    const creatorId = String(row.creator_id);
    const legacyContributors = Array.isArray(row.legacy_contributors) ? row.legacy_contributors : [];
    return {
      appliedAt: row.applied_at ? String(row.applied_at) : null,
      audienceId: String(row.audience_id || ""),
      audienceLabel: String(row.audience_label || ""),
      createdAt: String(row.created_at),
      creatorId,
      creatorName: creatorNames.get(creatorId) ?? (creatorId === "legacy-operational" ? "Equipe da instituição" : "Professor"),
      description: String(row.description || ""),
      estimatedDuration: row.estimated_duration == null ? null : Number(row.estimated_duration),
      examDate: String(row.exam_date || ""),
      groupType: String(row.group_type || "GERAL"),
      hasResults: resultIds.has(id),
      id,
      importProcessingError: row.import_processing_error ? String(row.import_processing_error) : null,
      importProcessingStatus: String(row.import_processing_status) as TeacherExam["importProcessingStatus"],
      importedAt: row.imported_at ? String(row.imported_at) : null,
      instructions: String(row.instructions || ""),
      legacyContributors: legacyContributors.map((item) => {
        const value = item as Record<string, unknown>;
        return { subject: String(value.subject || ""), teacherId: String(value.teacherId || ""), teacherName: String(value.teacherName || "") };
      }),
      needsReview: Boolean(row.needs_review),
      originalFileMimeType: row.original_file_mime_type ? String(row.original_file_mime_type) : null,
      originalFileName: row.original_file_name ? String(row.original_file_name) : null,
      originalFileSize: row.original_file_size == null ? null : Number(row.original_file_size),
      period: String(row.period || ""),
      publishedAt: row.published_at ? String(row.published_at) : null,
      questions: groupedQuestions.get(id) ?? [],
      sourceType: String(row.source_type) as TeacherExam["sourceType"],
      status: String(row.status) as TeacherExam["status"],
      subject: String(row.subject || ""),
      title: String(row.title || ""),
      updatedAt: String(row.updated_at),
      version: Number(row.version),
      yearSegment: String(row.year_segment || "OUTROS"),
    };
  });
}

export async function listTeacherExams(input: { actorId: string; includeArchived?: boolean; institutionalView?: boolean }) {
  let query = db().from("exams").select(examColumns).order("updated_at", { ascending: false }).limit(500);
  if (!input.institutionalView) query = query.eq("creator_id", input.actorId);
  if (!input.includeArchived) query = query.neq("status", "arquivada");
  const { data, error } = await query;
  ensure(error);
  return hydrate((data ?? []) as unknown as Array<Record<string, unknown>>);
}

export async function getTeacherExam(input: { actorId: string; examId: string; institutionalView?: boolean }) {
  let query = db().from("exams").select(examColumns).eq("id", input.examId);
  if (!input.institutionalView) query = query.eq("creator_id", input.actorId);
  const { data, error } = await query.maybeSingle();
  ensure(error);
  if (!data) return null;
  return (await hydrate([data as unknown as Record<string, unknown>]))[0] ?? null;
}

function examRow(actorId: string, creatorName: string, examId: string, input: TeacherExamInput, intent: "rascunho" | "publicar", source?: Partial<Record<string, unknown>>) {
  const published = intent === "publicar";
  const now = new Date().toISOString();
  return {
    alternatives: [...new Set(input.questions.flatMap((question) => question.alternatives))].slice(0, 10),
    audience_id: input.audienceId,
    audience_label: input.audienceLabel,
    code: `${input.title.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 12) || "PROVA"}-${input.examDate.slice(0, 4) || new Date().getFullYear()}`,
    creator_id: actorId,
    description: input.description,
    estimated_duration: input.estimatedDuration,
    exam_date: input.examDate,
    group_type: input.groupType || "GERAL",
    id: examId,
    instructions: input.instructions,
    period: input.period,
    published_at: published ? now : null,
    question_count: input.questions.length,
    released_at: published ? now : null,
    status: published ? "publicada" : "rascunho",
    subject: input.subject,
    template_version: "PS-CARD-4",
    title: input.title || "Prova sem título",
    year_segment: input.yearSegment || "OUTROS",
    ...source,
    _creatorName: creatorName,
  };
}

async function replaceExamContent(examId: string, input: TeacherExamInput) {
  const client = db();
  const questions = input.questions.map((question, index) => ({
    alternatives: question.alternatives,
    annulled: question.annulled,
    correct_answers: question.correctAnswers,
    correction_criteria: question.correctionCriteria,
    correction_notes: question.correctionNotes,
    exam_id: examId,
    id: question.id?.trim() || crypto.randomUUID(),
    image_path: question.imagePath || null,
    needs_review: question.needsReview,
    position: index + 1,
    prompt: question.prompt,
    type: question.type,
    weight: question.weight,
  }));
  const answerKeys = questions.map((question) => ({
    correct_answer: question.annulled ? "ANULADA" : String(question.correct_answers[0] || "CORRECAO_MANUAL"),
    exam_id: examId,
    question_number: question.position,
  }));
  const weights = questions.filter((question) => question.weight !== 1).map((question) => ({ peso: question.weight, questao: question.position }));
  const annulled = questions.filter((question) => question.annulled).map((question) => question.position);
  ensure((await client.from("answer_keys").delete().eq("exam_id", examId)).error);
  ensure((await client.from("exam_questions").delete().eq("exam_id", examId)).error);
  if (questions.length) ensure((await client.from("exam_questions").insert(questions)).error);
  if (answerKeys.length) ensure((await client.from("answer_keys").insert(answerKeys)).error);
  ensure((await client.from("correction_rules").upsert({
    default_weight: 1,
    exam_id: examId,
    max_score: questions.reduce((sum, question) => sum + question.weight, 0) || 10,
    rounding_places: 1,
    voided_question_mode: "full-credit",
    voided_questions: annulled,
    weights_by_question: weights,
  }, { onConflict: "exam_id" })).error);
}

export async function createTeacherExam(input: {
  actorId: string;
  creatorName: string;
  exam: TeacherExamInput;
  intent: "rascunho" | "publicar";
  source?: Partial<Record<string, unknown>>;
}) {
  const client = db();
  const examId = crypto.randomUUID();
  const row = examRow(input.actorId, input.creatorName, examId, input.exam, input.intent, input.source);
  const { _creatorName, ...storedRow } = row;
  ensure((await client.from("exams").insert(storedRow)).error);
  try {
    ensure((await client.from("exam_sections").insert({
      exam_id: examId,
      id: crypto.randomUUID(),
      question_count: Math.max(input.exam.questions.length, 1),
      question_start: 1,
      subject: input.exam.subject || "Geral",
      teacher_id: input.actorId,
      teacher_name: _creatorName,
    })).error);
    await replaceExamContent(examId, input.exam);
    return examId;
  } catch (error) {
    await client.from("exam_sections").delete().eq("exam_id", examId);
    await client.from("exams").delete().eq("id", examId).eq("creator_id", input.actorId);
    throw error;
  }
}

function structuralFingerprint(exam: Pick<TeacherExam, "questions"> | TeacherExamInput) {
  return JSON.stringify(exam.questions.map((question) => ({
    alternatives: question.alternatives,
    annulled: question.annulled,
    correctAnswers: question.correctAnswers,
    correctionCriteria: question.correctionCriteria,
    prompt: question.prompt,
    type: question.type,
    weight: question.weight,
  })));
}

export async function updateTeacherExam(input: { actorId: string; examId: string; exam: TeacherExamInput; expectedVersion?: number | null; intent: "rascunho" | "publicar" }) {
  const current = await getTeacherExam({ actorId: input.actorId, examId: input.examId });
  if (!current) throw new Error("Prova não encontrada ou não pertence a você.");
  if (input.expectedVersion && current.version !== input.expectedVersion) throw new Error("Esta prova foi alterada em outra sessão. Recarregue antes de salvar.");
  if (current.hasResults && structuralFingerprint(current) !== structuralFingerprint(input.exam)) {
    throw new Error("Esta prova já possui resultados. Duplique-a para alterar questões sem afetar o histórico.");
  }
  const row = examRow(input.actorId, current.creatorName, input.examId, input.exam, input.intent, {
    applied_at: current.appliedAt,
    import_processing_error: current.importProcessingError,
    import_processing_status: current.importProcessingStatus,
    imported_at: current.importedAt,
    legacy_contributors: current.legacyContributors,
    needs_review: input.exam.questions.some((question) => question.needsReview),
    original_file_mime_type: current.originalFileMimeType,
    original_file_name: current.originalFileName,
    original_file_size: current.originalFileSize,
    source_type: current.sourceType,
    status: current.hasResults ? "aplicada" : input.intent === "publicar" ? "publicada" : "rascunho",
    version: current.version + 1,
  });
  const { _creatorName, creator_id: _creatorId, id: _id, ...changes } = row;
  const { data, error } = await db().from("exams").update(changes).eq("id", input.examId).eq("creator_id", input.actorId).eq("version", current.version).select("id").maybeSingle();
  ensure(error);
  if (!data) throw new Error("Esta prova foi alterada em outra sessão. Recarregue antes de salvar.");
  if (!current.hasResults) await replaceExamContent(input.examId, input.exam);
  await db().from("exam_sections").update({ question_count: Math.max(input.exam.questions.length, 1), subject: input.exam.subject || "Geral" }).eq("exam_id", input.examId).eq("teacher_id", input.actorId);
  return current.version + 1;
}

export async function duplicateTeacherExam(actorId: string, creatorName: string, examId: string) {
  const source = await getTeacherExam({ actorId, examId });
  if (!source) throw new Error("Prova não encontrada ou não pertence a você.");
  const copy: TeacherExamInput = {
    audienceId: source.audienceId,
    audienceLabel: source.audienceLabel,
    description: source.description,
    estimatedDuration: source.estimatedDuration,
    examDate: source.examDate,
    groupType: source.groupType,
    instructions: source.instructions,
    period: source.period,
    questions: source.questions.map(({ id: _id, imagePath, ...question }) => ({ ...question, imagePath })),
    subject: source.subject,
    title: `Cópia de ${source.title}`,
    yearSegment: source.yearSegment,
  };
  return createTeacherExam({ actorId, creatorName, exam: copy, intent: "rascunho", source: { needs_review: source.needsReview, source_type: source.sourceType } });
}

export async function setTeacherExamArchived(actorId: string, examId: string, archived: boolean) {
  const { data, error } = await db().from("exams").update({ status: archived ? "arquivada" : "rascunho", updated_at: new Date().toISOString() }).eq("id", examId).eq("creator_id", actorId).select("id").maybeSingle();
  ensure(error);
  if (!data) throw new Error("Prova não encontrada ou não pertence a você.");
}

export async function deleteTeacherExam(actorId: string, examId: string) {
  const current = await getTeacherExam({ actorId, examId });
  if (!current) throw new Error("Prova não encontrada ou não pertence a você.");
  if (current.hasResults) throw new Error("Esta prova possui resultados e não pode ser excluída. Arquive-a para preservar o histórico.");
  const client = db();
  const { data: files, error: fileError } = await client.from("exam_files").select("storage_path").eq("exam_id", examId).eq("owner_id", actorId);
  ensure(fileError);
  if (files?.length) ensure((await client.storage.from("exam-imports").remove(files.map((file) => String(file.storage_path)))).error);
  ensure((await client.from("exam_sections").delete().eq("exam_id", examId).eq("teacher_id", actorId)).error);
  const { data, error } = await client.from("exams").delete().eq("id", examId).eq("creator_id", actorId).select("id").maybeSingle();
  ensure(error);
  if (!data) throw new Error("Não foi possível excluir a prova.");
}

export function teacherExamClient() {
  return db();
}
