import { normalizeExamPrintOptions } from "@/lib/exam-print-options";
import type { TeacherExamContentVersion, TeacherExamInput } from "@/types/teacher-exams";

export function buildTeacherExamRow(
  actorId: string,
  creatorName: string,
  examId: string,
  input: TeacherExamInput,
  intent: "rascunho" | "publicar",
  source: Partial<Record<string, unknown>> = {},
  now = new Date().toISOString(),
): Record<string, unknown> & { _creatorName: string } {
  const published = intent === "publicar";
  return {
    alternatives: [...new Set(input.questions.flatMap((question) => question.alternatives))].slice(0, 10),
    applied_at: null,
    audience_id: input.audienceId,
    audience_label: input.audienceLabel,
    code: `${input.title.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 12) || "PROVA"}-${input.examDate.slice(0, 4) || new Date().getFullYear()}`,
    created_at: now,
    creator_id: actorId,
    description: input.description,
    estimated_duration: input.estimatedDuration,
    exam_date: input.examDate,
    group_type: input.groupType || "GERAL",
    id: examId,
    import_processing_error: null,
    import_processing_status: "nao_aplicavel",
    imported_at: null,
    instructions: input.instructions,
    legacy_contributors: [],
    needs_review: input.questions.some((question) => question.needsReview),
    original_file_mime_type: null,
    original_file_name: null,
    original_file_size: null,
    period: input.period,
    print_options: normalizeExamPrintOptions(input.printOptions),
    published_at: published ? now : null,
    question_count: input.questions.length,
    released_at: published ? now : null,
    source_type: "manual",
    status: published ? "publicada" : "rascunho",
    subject: input.subject,
    subject_id: input.subjectId || null,
    template_version: normalizeExamPrintOptions(input.printOptions).answerSheetModel === "fanucchi" ? "FANUCCHI-OMR-V1" : "PS-CARD-4",
    title: input.title || "Prova sem título",
    updated_at: now,
    version: 1,
    year_segment: input.yearSegment || "OUTROS",
    ...source,
    _creatorName: creatorName,
  };
}

export function buildTeacherExamContentVersionRow(
  input: Pick<TeacherExamContentVersion, "reason" | "version"> & {
    actorId: string;
    examId: string;
    snapshot: TeacherExamInput;
    id?: string;
    createdAt?: string;
  },
) {
  return {
    created_at: input.createdAt ?? new Date().toISOString(),
    created_by: input.actorId,
    exam_id: input.examId,
    id: input.id ?? crypto.randomUUID(),
    reason: input.reason,
    snapshot: input.snapshot,
    version: input.version,
  };
}
