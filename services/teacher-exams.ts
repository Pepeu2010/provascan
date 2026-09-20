import "server-only";

import { createClient } from "@supabase/supabase-js";
import { syncExamAssignments, validateNewExamAssignmentPairs } from "@/services/exam-assignments";
import { normalizeExamPrintOptions } from "@/lib/exam-print-options";
import { teacherExamInputSchema } from "@/lib/teacher-exam-validation";
import type { UserRole } from "@/types/auth";
import type { TeacherExam, TeacherExamContentVersion, TeacherExamInput, TeacherExamQuestion } from "@/types/teacher-exams";

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
  "id", "title", "description", "subject", "subject_id", "audience_id", "audience_label", "group_type", "year_segment", "period",
  "exam_date", "instructions", "estimated_duration", "print_options", "creator_id", "source_type", "status", "original_file_name",
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
      printOptions: normalizeExamPrintOptions(row.print_options),
      publishedAt: row.published_at ? String(row.published_at) : null,
      questions: groupedQuestions.get(id) ?? [],
      sourceType: String(row.source_type) as TeacherExam["sourceType"],
      status: String(row.status) as TeacherExam["status"],
      subject: String(row.subject || ""),
      subjectId: row.subject_id ? String(row.subject_id) : null,
      assignmentGroups: [],
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
    print_options: normalizeExamPrintOptions(input.printOptions),
    published_at: published ? now : null,
    question_count: input.questions.length,
    released_at: published ? now : null,
    status: published ? "publicada" : "rascunho",
    subject: input.subject,
    subject_id: input.subjectId || null,
    template_version: normalizeExamPrintOptions(input.printOptions).answerSheetModel === "fanucchi" ? "FANUCCHI-OMR-V1" : "PS-CARD-4",
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
  actorRole?: import("@/types/auth").UserRole;
  actorId: string;
  creatorName: string;
  exam: TeacherExamInput;
  intent: "rascunho" | "publicar";
  source?: Partial<Record<string, unknown>>;
}) {
  if (input.intent === "publicar") {
    if (!input.actorRole) throw new Error("Perfil de acesso ausente.");
    return createPublishedTeacherExam({ ...input, actorRole: input.actorRole, intent: "publicar" });
  }
  const client = db();
  const examId = crypto.randomUUID();
  const freeSubjectExam = { ...input.exam, printOptions: normalizeExamPrintOptions(input.exam.printOptions), subject: input.exam.subject.trim(), subjectId: null };
  const row = examRow(input.actorId, input.creatorName, examId, freeSubjectExam, input.intent, input.source);
  const { _creatorName, ...storedRow } = row;
  ensure((await client.from("exams").insert(storedRow)).error);
  try {
    ensure((await client.from("exam_sections").insert({
      exam_id: examId,
      id: crypto.randomUUID(),
      question_count: Math.max(input.exam.questions.length, 1),
      question_start: 1,
      subject: freeSubjectExam.subject || "Geral",
      teacher_id: input.actorId,
      teacher_name: _creatorName,
    })).error);
    await replaceExamContent(examId, freeSubjectExam);
    await saveExamContentVersion({ actorId: input.actorId, examId, reason: "criada", snapshot: freeSubjectExam, version: 1 });
    return examId;
  } catch (error) {
    await client.from("exam_sections").delete().eq("exam_id", examId);
    await client.from("exams").delete().eq("id", examId).eq("creator_id", input.actorId);
    throw error;
  }
}

async function createPublishedTeacherExam(input: {
  actorId: string; actorRole: import("@/types/auth").UserRole; creatorName: string; exam: TeacherExamInput; intent: "publicar"; source?: Partial<Record<string, unknown>>;
}) {
  const groups = input.exam.assignmentGroups ?? [];
  // O nome da disciplina é um retrato textual da prova. Ele não consulta nem
  // cadastra nada no catálogo escolar; turmas e responsáveis continuam sendo
  // revalidados no servidor pelo escopo ativo de cada pessoa.
  const pairs = await validateNewExamAssignmentPairs({ actorId: input.actorId, actorRole: input.actorRole, groups });
  const examId = crypto.randomUUID();
  const normalizedExam = { ...input.exam, printOptions: normalizeExamPrintOptions(input.exam.printOptions), subject: input.exam.subject.trim(), subjectId: null };
  const row = examRow(input.actorId, input.creatorName, examId, normalizedExam, "publicar", input.source);
  const { _creatorName, ...storedRow } = row;
  const questions = normalizedExam.questions.map((question, index) => ({
    alternatives: question.alternatives, annulled: question.annulled, correct_answers: question.correctAnswers,
    correction_criteria: question.correctionCriteria, correction_notes: question.correctionNotes,
    id: question.id?.trim() || crypto.randomUUID(), image_path: question.imagePath || null,
    needs_review: question.needsReview, position: index + 1, prompt: question.prompt, type: question.type, weight: question.weight,
  }));
  const payload = {
    audit_event: "teacher_exam_published", audit_id: crypto.randomUUID(),
    assignments: pairs.map((pair) => ({ class_id: pair.classId, id: crypto.randomUUID(), teacher_id: pair.teacherId })),
    audit_metadata: { questionCount: questions.length }, creator_name: _creatorName, exam: storedRow,
    max_score: questions.reduce((sum, question) => sum + Number(question.weight), 0) || 10,
    questions, section_id: crypto.randomUUID(),
    voided_questions: questions.filter((question) => question.annulled).map((question) => question.position),
    weights_by_question: questions.filter((question) => Number(question.weight) !== 1).map((question) => ({ peso: question.weight, questao: question.position })),
  };
  const { data, error } = await db().rpc("create_teacher_exam_transaction", { p_payload: payload });
  ensure(error, "Não foi possível publicar a prova.");
  if (String(data || "") !== examId) throw new Error("A publicação não foi confirmada.");
  await saveExamContentVersion({ actorId: input.actorId, examId, reason: "publicada", snapshot: normalizedExam, version: 1 });
  return examId;
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

function versionSnapshot(input: TeacherExamInput): TeacherExamInput {
  // A aplicação é preservada no estado atual. Restaurar uma versão antiga não
  // pode redistribuir a prova a pessoas que hoje não possuem mais esse acesso.
  return {
    ...input,
    assignmentGroups: [],
    printOptions: normalizeExamPrintOptions(input.printOptions),
    questions: input.questions.map((question, index) => ({ ...question, position: index + 1 })),
    subject: input.subject.trim(),
    subjectId: null,
  };
}

async function saveExamContentVersion(input: { actorId: string; examId: string; reason: TeacherExamContentVersion["reason"]; snapshot: TeacherExamInput; version: number }) {
  const { error } = await db().from("exam_content_versions").insert({
    created_by: input.actorId,
    exam_id: input.examId,
    id: crypto.randomUUID(),
    reason: input.reason,
    snapshot: versionSnapshot(input.snapshot),
    version: input.version,
  });
  ensure(error, "A prova foi salva, mas o histórico não pôde ser registrado.");
}

function inputFromExam(exam: TeacherExam): TeacherExamInput {
  return {
    assignmentGroups: [],
    audienceId: exam.audienceId,
    audienceLabel: exam.audienceLabel,
    description: exam.description,
    estimatedDuration: exam.estimatedDuration,
    examDate: exam.examDate,
    groupType: exam.groupType,
    instructions: exam.instructions,
    period: exam.period,
    printOptions: exam.printOptions,
    questions: exam.questions.map(({ id, imagePath, ...question }) => ({ ...question, id, imagePath })),
    subject: exam.subject,
    subjectId: null,
    title: exam.title,
    yearSegment: exam.yearSegment,
  };
}

async function preserveCurrentExamContentVersion(actorId: string, exam: TeacherExam) {
  const { error } = await db().from("exam_content_versions").upsert({
    created_by: actorId,
    exam_id: exam.id,
    id: crypto.randomUUID(),
    reason: "salva",
    snapshot: versionSnapshot(inputFromExam(exam)),
    version: exam.version,
  }, { ignoreDuplicates: true, onConflict: "exam_id,version" });
  ensure(error, "Não foi possível preservar a versão atual da prova.");
}

export async function listTeacherExamContentVersions(input: { actorId: string; examId: string; institutionalView?: boolean }) {
  const exam = await getTeacherExam(input);
  if (!exam) return null;
  const { data, error } = await db().from("exam_content_versions")
    .select("id,version,created_by,reason,created_at")
    .eq("exam_id", input.examId)
    .order("version", { ascending: false })
    .limit(50);
  ensure(error, "Não foi possível carregar as versões da prova.");
  return (data ?? []).map((row) => ({
    createdAt: String(row.created_at),
    createdBy: String(row.created_by),
    id: String(row.id),
    reason: String(row.reason) as TeacherExamContentVersion["reason"],
    version: Number(row.version),
  } satisfies TeacherExamContentVersion));
}

export async function restoreTeacherExamContentVersion(input: { actorId: string; examId: string; expectedVersion?: number | null; versionId: string }) {
  const current = await getTeacherExam({ actorId: input.actorId, examId: input.examId });
  if (!current) throw new Error("Prova não encontrada ou não pertence a você.");
  if (current.hasResults) throw new Error("Esta prova já possui correções. Duplique-a para preservar o histórico.");
  if (input.expectedVersion && current.version !== input.expectedVersion) throw new Error("Esta prova foi alterada em outra sessão. Recarregue antes de restaurar.");
  await preserveCurrentExamContentVersion(input.actorId, current);
  const { data: stored, error: storedError } = await db().from("exam_content_versions")
    .select("snapshot")
    .eq("exam_id", input.examId)
    .eq("id", input.versionId)
    .maybeSingle();
  ensure(storedError, "Não foi possível encontrar esta versão.");
  if (!stored) throw new Error("A versão solicitada não pertence a esta prova.");
  const parsed = teacherExamInputSchema.safeParse(stored.snapshot);
  if (!parsed.success) throw new Error("Esta versão antiga não está em um formato que pode ser restaurado com segurança.");
  const restored = versionSnapshot(parsed.data);
  const row = examRow(input.actorId, current.creatorName, input.examId, restored, current.status === "publicada" ? "publicar" : "rascunho", {
    applied_at: current.appliedAt,
    import_processing_error: current.importProcessingError,
    import_processing_status: current.importProcessingStatus,
    imported_at: current.importedAt,
    legacy_contributors: current.legacyContributors,
    needs_review: restored.questions.some((question) => question.needsReview),
    original_file_mime_type: current.originalFileMimeType,
    original_file_name: current.originalFileName,
    original_file_size: current.originalFileSize,
    published_at: current.publishedAt,
    source_type: current.sourceType,
    status: current.status,
    version: current.version + 1,
  });
  const { _creatorName, creator_id: _creatorId, id: _id, ...changes } = row;
  void _creatorName;
  void _creatorId;
  void _id;
  const questions = restored.questions.map((question, index) => ({
    alternatives: question.alternatives,
    annulled: question.annulled,
    correction_criteria: question.correctionCriteria,
    correction_notes: question.correctionNotes,
    correct_answers: question.correctAnswers,
    id: question.id?.trim() || crypto.randomUUID(),
    image_path: question.imagePath || null,
    needs_review: question.needsReview,
    position: index + 1,
    prompt: question.prompt,
    type: question.type,
    weight: question.weight,
  }));
  const { data, error } = await db().rpc("restore_teacher_exam_content_transaction", {
    p_payload: {
      actor_id: input.actorId,
      exam: changes,
      exam_id: input.examId,
      expected_version: current.version,
      max_score: questions.reduce((sum, question) => sum + Number(question.weight), 0) || 10,
      next_version: current.version + 1,
      questions,
      snapshot: versionSnapshot(restored),
      version_id: crypto.randomUUID(),
      voided_questions: questions.filter((question) => question.annulled).map((question) => question.position),
      weights_by_question: questions.filter((question) => Number(question.weight) !== 1).map((question) => ({ peso: question.weight, questao: question.position })),
    },
  });
  ensure(error, "Não foi possível restaurar esta versão.");
  if (Number(data) !== current.version + 1) throw new Error("A restauração não foi confirmada.");
  return Number(data);
}

export async function updateTeacherExam(input: { actorId: string; actorRole?: UserRole; examId: string; exam: TeacherExamInput; expectedVersion?: number | null; intent: "rascunho" | "publicar" }) {
  const current = await getTeacherExam({ actorId: input.actorId, examId: input.examId });
  if (!current) throw new Error("Prova não encontrada ou não pertence a você.");
  if (input.expectedVersion && current.version !== input.expectedVersion) throw new Error("Esta prova foi alterada em outra sessão. Recarregue antes de salvar.");
  if (current.hasResults && structuralFingerprint(current) !== structuralFingerprint(input.exam)) {
    throw new Error("Esta prova já possui resultados. Duplique-a para alterar questões sem afetar o histórico.");
  }
  await preserveCurrentExamContentVersion(input.actorId, current);
  const freeSubjectExam = { ...input.exam, printOptions: normalizeExamPrintOptions(input.exam.printOptions), subject: input.exam.subject.trim(), subjectId: null };
  if (input.intent === "publicar") {
    if (!input.actorRole) throw new Error("Não foi possível validar seu perfil de acesso.");
    await validateNewExamAssignmentPairs({ actorId: input.actorId, actorRole: input.actorRole, groups: freeSubjectExam.assignmentGroups ?? [] });
  }
  const row = examRow(input.actorId, current.creatorName, input.examId, freeSubjectExam, input.intent, {
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
  if (!current.hasResults) await replaceExamContent(input.examId, freeSubjectExam);
  await db().from("exam_sections").update({ question_count: Math.max(freeSubjectExam.questions.length, 1), subject: freeSubjectExam.subject || "Geral" }).eq("exam_id", input.examId).eq("teacher_id", input.actorId);
  if (input.intent === "publicar") {
    if (!input.actorRole) throw new Error("Não foi possível validar seu perfil de acesso.");
    await syncExamAssignments({ actorId: input.actorId, actorRole: input.actorRole, examId: input.examId, groups: freeSubjectExam.assignmentGroups ?? [] });
  }
  await saveExamContentVersion({ actorId: input.actorId, examId: input.examId, reason: input.intent === "publicar" ? "publicada" : "salva", snapshot: freeSubjectExam, version: current.version + 1 });
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
    printOptions: source.printOptions,
    questions: source.questions.map(({ id: _id, imagePath, ...question }) => ({ ...question, imagePath })),
    subject: source.subject,
    subjectId: source.subjectId ?? null,
    assignmentGroups: [],
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
