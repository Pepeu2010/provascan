import { z } from "zod";
import { DEFAULT_UNIVERSAL_GRADING_RULES } from "@/services/universal-grading-rules";

const safeText = z.string().trim().min(1).max(200).refine((value) => !/[\\/\u0000-\u001f]/.test(value), "Texto contém caminho ou caractere inválido.");
const safeSourceLabel = z.string().trim().min(1).max(260).refine((value) => !/[\\/\u0000-\u001f]/.test(value), "Nome do documento contém caminho ou caractere inválido.");
const alternative = z.string().trim().regex(/^[A-Z0-9]{1,3}$/).max(3);
const subjectSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  questionEnd: z.number().int().min(1).max(200),
  questionStart: z.number().int().min(1).max(200),
}).strict();

export const universalGradingRulesSchema = z.object({
  annulledPolicy: z.enum(["full_credit", "ignore"]),
  annulledQuestions: z.array(z.number().int().min(1).max(200)).max(200),
  defaultWeight: z.number().finite().positive().max(100),
  maxScore: z.number().finite().positive().max(1000),
  multipleMarksPolicy: z.enum(["blank", "incorrect", "review"]),
  questionWeights: z.record(z.string().regex(/^\d{1,3}$/), z.number().finite().positive().max(100)),
}).strict();

const reviewAuditSchema = z.object({
  at: z.string().datetime(),
  from: z.string().max(40),
  previous: z.object({
    confidence: z.number().finite().min(0).max(1),
    detectedAnswers: z.array(alternative).max(10),
    question: z.number().int().min(1).max(200),
    status: z.enum(["marked", "blank", "multiple_marks", "uncertain", "erasure_suspected"]),
  }).strict(),
  question: z.number().int().min(1).max(200),
  to: z.string().max(40),
}).strict();

export const universalStructureSchema = z.object({
  alternatives: z.array(alternative).min(2).max(10),
  columnCount: z.number().int().min(1).max(8),
  confidence: z.number().finite().min(0).max(1),
  source: z.enum(["detected", "manual", "saved_template", "provascan"]),
  subjects: z.array(subjectSchema).min(1).max(30),
  totalQuestions: z.number().int().min(1).max(200),
}).strict().superRefine((structure, context) => {
  let expectedStart = 1;
  for (const subject of structure.subjects) {
    if (subject.questionStart !== expectedStart || subject.questionEnd < subject.questionStart) {
      context.addIssue({ code: "custom", message: "Intervalos de matérias inválidos.", path: ["subjects"] });
      return;
    }
    expectedStart = subject.questionEnd + 1;
  }
  if (expectedStart - 1 !== structure.totalQuestions) {
    context.addIssue({ code: "custom", message: "Total de questões divergente.", path: ["totalQuestions"] });
  }
});

export const externalTemplateSchema = z.object({
  answerKey: z.array(alternative).min(1).max(200),
  gradingRules: universalGradingRulesSchema.default(DEFAULT_UNIVERSAL_GRADING_RULES),
  name: safeText,
  structure: universalStructureSchema,
}).strict().superRefine((template, context) => {
  if (template.answerKey.length !== template.structure.totalQuestions) {
    context.addIssue({ code: "custom", message: "O gabarito deve cobrir todas as questões.", path: ["answerKey"] });
  }
  const allowed = new Set(template.structure.alternatives);
  template.answerKey.forEach((answer, index) => {
    if (!allowed.has(answer)) context.addIssue({ code: "custom", message: `Alternativa inválida na questão ${index + 1}.`, path: ["answerKey", index] });
  });
});

const detectedAnswerSchema = z.object({
  confidence: z.number().finite().min(0).max(1),
  detectedAnswers: z.array(alternative).max(10),
  question: z.number().int().min(1).max(200),
  status: z.enum(["marked", "blank", "multiple_marks", "uncertain", "erasure_suspected"]),
}).strict();

export const externalCorrectionSchema = z.object({
  answerKey: z.array(alternative).min(1).max(200),
  answers: z.array(detectedAnswerSchema).min(1).max(200),
  gradingRules: universalGradingRulesSchema.default(DEFAULT_UNIVERSAL_GRADING_RULES),
  reviewAudit: z.array(reviewAuditSchema).max(500).default([]),
  sourceLabel: safeSourceLabel,
  studentName: z.string().trim().min(1).max(160),
  structure: universalStructureSchema,
  templateId: z.string().uuid().nullable(),
}).strict().superRefine((correction, context) => {
  const total = correction.structure.totalQuestions;
  if (correction.answerKey.length !== total || correction.answers.length !== total) {
    context.addIssue({ code: "custom", message: "A correção deve cobrir todas as questões.", path: ["answers"] });
  }
  const allowed = new Set(correction.structure.alternatives);
  correction.answerKey.forEach((answer, index) => {
    if (!allowed.has(answer)) context.addIssue({ code: "custom", message: `Gabarito inválido na questão ${index + 1}.`, path: ["answerKey", index] });
  });
  correction.answers.forEach((answer, index) => {
    if (answer.question !== index + 1 || answer.detectedAnswers.some((mark) => !allowed.has(mark))) {
      context.addIssue({ code: "custom", message: `Resposta inválida na questão ${index + 1}.`, path: ["answers", index] });
    }
    const validCardinality = answer.status === "marked"
      ? answer.detectedAnswers.length === 1
      : answer.status === "multiple_marks"
        ? answer.detectedAnswers.length >= 2
        : answer.status === "blank"
          ? answer.detectedAnswers.length === 0
          : true;
    if (!validCardinality) {
      context.addIssue({ code: "custom", message: `Estado de marcação inválido na questão ${index + 1}.`, path: ["answers", index, "status"] });
    }
  });
});

export const externalCorrectionBatchSchema = z.object({
  corrections: z.array(externalCorrectionSchema).min(1).max(100),
}).strict();

export const externalTemplateActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("archive") }).strict(),
  z.object({ action: z.literal("duplicate") }).strict(),
  z.object({ action: z.literal("favorite"), value: z.boolean() }).strict(),
  z.object({ action: z.literal("rename"), name: safeText }).strict(),
  z.object({ action: z.literal("used") }).strict(),
]);

export type ExternalTemplateInput = z.infer<typeof externalTemplateSchema>;
export type ExternalCorrectionInput = z.infer<typeof externalCorrectionSchema>;
