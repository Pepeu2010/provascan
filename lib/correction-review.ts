import type { UniversalDetectedAnswer } from "@/services/universal-exam-core";

export type ReviewAuditEntry = {
  at: string;
  from: string;
  previous: UniversalDetectedAnswer;
  question: number;
  to: string;
};

export function buildReviewQueue(batches: Array<{ answers: UniversalDetectedAnswer[]; sourceLabel: string; studentName: string }>) {
  return batches.flatMap((batch, batchIndex) => batch.answers
    .filter((answer) => answer.status === "multiple_marks" || answer.status === "uncertain" || answer.status === "erasure_suspected")
    .sort((left, right) => left.question - right.question)
    .map((answer) => ({ answer, batchIndex, question: answer.question, sourceLabel: batch.sourceLabel, studentName: batch.studentName })));
}

export function applyReviewEdit(answers: UniversalDetectedAnswer[], question: number, answer: string, at = new Date().toISOString()) {
  const previous = answers.find((item) => item.question === question);
  if (!previous) throw new Error(`Questão ${question} não encontrada.`);
  const next = answer ? { confidence: 1, detectedAnswers: [answer], question, status: "marked" as const } : { confidence: 1, detectedAnswers: [], question, status: "blank" as const };
  return {
    answers: answers.map((item) => item.question === question ? next : item),
    audit: { at, from: previous.detectedAnswers.join("+") || "Em branco", previous: { ...previous, detectedAnswers: [...previous.detectedAnswers] }, question, to: answer || "Em branco" } satisfies ReviewAuditEntry,
  };
}

export function undoReviewEdit(answers: UniversalDetectedAnswer[], audit: ReviewAuditEntry) {
  return answers.map((item) => item.question === audit.question ? { ...audit.previous, detectedAnswers: [...audit.previous.detectedAnswers] } : item);
}
