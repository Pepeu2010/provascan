import { z } from "zod";
import { printAlternativeLayouts, printSizes, printTemplates, printTypefaces } from "@/lib/exam-print-options";
import type { ExamQuestionType, TeacherExamInput } from "@/types/teacher-exams";

const shortText = z.string().trim().max(200);
const questionType = z.enum(["multipla_escolha", "verdadeiro_falso", "resposta_curta", "discursiva", "associacao"]);
const printOptions = z.object({
  alternativeLayout: z.enum(printAlternativeLayouts),
  size: z.enum(printSizes),
  template: z.enum(printTemplates),
  typeface: z.enum(printTypefaces),
}).strict();

export const teacherExamQuestionSchema = z.object({
  id: z.string().trim().max(120).optional(),
  position: z.number().int().min(1).max(200),
  type: questionType,
  prompt: z.string().trim().max(12_000),
  alternatives: z.array(z.string().trim().max(2_000)).max(12),
  correctAnswers: z.array(z.string().trim().max(2_000)).max(12),
  weight: z.number().finite().min(0).max(1_000),
  annulled: z.boolean(),
  correctionCriteria: z.string().trim().max(8_000),
  correctionNotes: z.string().trim().max(4_000),
  needsReview: z.boolean(),
  imagePath: z.string().trim().max(500).nullable().optional(),
}).strict();

export const teacherExamInputSchema = z.object({
  title: z.string().trim().max(200),
  description: z.string().trim().max(4_000),
  subject: shortText,
  subjectId: z.string().trim().max(120).nullable().optional(),
  assignmentGroups: z.array(z.object({ teacherId: z.string().trim().max(120), classIds: z.array(z.string().trim().max(120)).max(200) }).strict()).max(200).optional(),
  audienceId: z.string().trim().max(120),
  audienceLabel: shortText,
  groupType: z.string().trim().max(40),
  yearSegment: z.string().trim().max(20),
  period: z.string().trim().max(80),
  printOptions: printOptions.optional(),
  examDate: z.string().trim().max(80),
  instructions: z.string().trim().max(8_000),
  estimatedDuration: z.number().int().min(1).max(600).nullable(),
  questions: z.array(teacherExamQuestionSchema).max(200),
}).strict();

export const teacherExamSaveSchema = z.object({
  exam: teacherExamInputSchema,
  expectedVersion: z.number().int().min(1).nullable().optional(),
  intent: z.enum(["rascunho", "publicar"]),
}).strict();

export const teacherExamActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("duplicar") }).strict(),
  z.object({ action: z.literal("arquivar") }).strict(),
  z.object({ action: z.literal("restaurar") }).strict(),
  z.object({ action: z.literal("excluir") }).strict(),
]);

export function validateExamForPublication(exam: TeacherExamInput): string[] {
  const errors: string[] = [];
  // Nome, disciplina e público organizam a prova, mas não podem impedir um
  // professor de montar e publicar uma avaliação. A disciplina é um retrato
  // textual da prova — nunca exige cadastro prévio na tabela `subjects`.
  if (!exam.questions.length) errors.push("Adicione ao menos uma questão.");
  exam.questions.forEach((question, index) => {
    const label = `Questão ${index + 1}`;
    if (!question.prompt.trim()) errors.push(`${label}: informe o enunciado.`);
    if (question.weight < 0) errors.push(`${label}: informe uma pontuação válida.`);
    if (question.annulled) return;
    if (question.type === "multipla_escolha" || question.type === "verdadeiro_falso") {
      if (question.alternatives.filter(Boolean).length < 2) errors.push(`${label}: informe ao menos duas alternativas.`);
      if (!question.correctAnswers.length) errors.push(`${label}: selecione a resposta correta.`);
    }
    if ((question.type === "discursiva" || question.type === "resposta_curta") && !question.correctionCriteria.trim()) {
      errors.push(`${label}: informe o critério de correção.`);
    }
  });
  return errors;
}

export function defaultQuestion(position: number, type: ExamQuestionType = "multipla_escolha") {
  const alternatives = type === "verdadeiro_falso" ? ["Verdadeiro", "Falso"] : type === "multipla_escolha" ? ["", "", "", ""] : [];
  return {
    annulled: false,
    alternatives,
    correctAnswers: [],
    correctionCriteria: "",
    correctionNotes: "",
    needsReview: false,
    position,
    prompt: "",
    type,
    weight: 1,
  } satisfies TeacherExamInput["questions"][number];
}
