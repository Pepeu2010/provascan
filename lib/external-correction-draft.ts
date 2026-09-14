import type {
  UniversalDetectedAnswer,
  UniversalExamStructure,
  gradeObjectiveAnswers,
} from "@/services/universal-exam-core";

export const EXTERNAL_CORRECTION_DRAFT_KEY = "provascan:external-correction-draft:v1";
export const DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1_000;

export type ExternalCorrectionStage = "source" | "structure" | "key" | "students" | "review";

export type DraftBatchItem = {
  answers: UniversalDetectedAnswer[];
  elapsedMs: number;
  grade: ReturnType<typeof gradeObjectiveAnswers>;
  previewUrls: Record<number, string>;
  sourceLabel: string;
  studentName: string;
};

export type ExternalCorrectionDraftInput = {
  alternativeCount: string;
  answerKey: string[];
  answerKeyText: string;
  batch: DraftBatchItem[];
  columnCount: string;
  stage: ExternalCorrectionStage;
  structure: UniversalExamStructure | null;
  subjectsText: string;
  templateId: string | null;
  templateName: string;
  totalQuestions: string;
};

export type ExternalCorrectionDraft = ExternalCorrectionDraftInput & {
  updatedAt: string;
  version: 1;
};

const stages = new Set<ExternalCorrectionStage>(["source", "structure", "key", "students", "review"]);

export function serializeExternalCorrectionDraft(input: ExternalCorrectionDraftInput, now = Date.now()) {
  const draft: ExternalCorrectionDraft = {
    ...input,
    batch: input.batch.map((item) => ({ ...item, previewUrls: {} })),
    updatedAt: new Date(now).toISOString(),
    version: 1,
  };
  return JSON.stringify(draft);
}

export function parseExternalCorrectionDraft(raw: string | null, now = Date.now()): ExternalCorrectionDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ExternalCorrectionDraft>;
    const updatedAt = Date.parse(value.updatedAt ?? "");
    if (
      value.version !== 1
      || !value.stage
      || !stages.has(value.stage)
      || !Number.isFinite(updatedAt)
      || now - updatedAt > DRAFT_MAX_AGE_MS
      || !Array.isArray(value.answerKey)
      || !Array.isArray(value.batch)
    ) return null;

    return {
      alternativeCount: String(value.alternativeCount ?? "5"),
      answerKey: value.answerKey.filter((answer): answer is string => typeof answer === "string"),
      answerKeyText: String(value.answerKeyText ?? ""),
      batch: value.batch.filter(isDraftBatchItem).map((item) => ({ ...item, previewUrls: {} })),
      columnCount: String(value.columnCount ?? "1"),
      stage: value.stage,
      structure: value.structure ?? null,
      subjectsText: String(value.subjectsText ?? ""),
      templateId: typeof value.templateId === "string" ? value.templateId : null,
      templateName: String(value.templateName ?? ""),
      totalQuestions: String(value.totalQuestions ?? ""),
      updatedAt: value.updatedAt!,
      version: 1,
    };
  } catch {
    return null;
  }
}

export function buildDraftResumeLabel(draft: ExternalCorrectionDraft, now = Date.now()) {
  if (draft.batch.length) {
    return `Continuar correção de ${draft.batch.length} ${draft.batch.length === 1 ? "aluno" : "alunos"}`;
  }
  const minutes = Math.max(0, Math.floor((now - Date.parse(draft.updatedAt)) / 60_000));
  if (minutes < 1) return "Continuar última correção";
  if (minutes < 60) return `Continuar correção de ${minutes} min atrás`;
  return "Continuar última correção";
}

function isDraftBatchItem(value: unknown): value is DraftBatchItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<DraftBatchItem>;
  return Array.isArray(item.answers)
    && typeof item.elapsedMs === "number"
    && Boolean(item.grade && typeof item.grade === "object")
    && typeof item.sourceLabel === "string"
    && typeof item.studentName === "string";
}
