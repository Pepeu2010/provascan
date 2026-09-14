import assert from "node:assert/strict";
import { externalCorrectionBatchSchema, externalCorrectionSchema, externalTemplateSchema } from "../lib/universal-exam-validation";

const structure = {
  alternatives: ["A", "B", "C", "D", "E"],
  columnCount: 2,
  confidence: 0.86,
  source: "detected" as const,
  subjects: [
    { id: "p", name: "Português", questionStart: 1, questionEnd: 10 },
    { id: "m", name: "Matemática", questionStart: 11, questionEnd: 25 },
  ],
  totalQuestions: 25,
};

assert.equal(externalTemplateSchema.safeParse({ answerKey: Array(25).fill("A"), name: "Simulado 1º EM", structure }).success, true);
assert.equal(externalTemplateSchema.safeParse({ answerKey: Array(24).fill("A"), name: "Incompleto", structure }).success, false);
assert.equal(externalTemplateSchema.safeParse({ answerKey: Array(25).fill("X"), name: "Alternativa inválida", structure }).success, false);

const correction = {
  answerKey: Array(25).fill("A"),
  answers: Array.from({ length: 25 }, (_, index) => ({ confidence: 0.91, detectedAnswers: ["A"], question: index + 1, status: "marked" })),
  sourceLabel: "cartoes-alunos.pdf · página 1",
  studentName: "Aluno 01",
  structure,
  templateId: null,
};
assert.equal(externalCorrectionSchema.safeParse(correction).success, true);
assert.equal(externalCorrectionSchema.safeParse({ ...correction, sourceLabel: "C:\\Users\\Professor\\segredo.pdf" }).success, false);
assert.equal(externalCorrectionSchema.safeParse({ ...correction, summary: { score: 10 } }).success, false, "O cliente não pode enviar uma nota confiada pelo servidor.");
assert.equal(externalCorrectionBatchSchema.safeParse({ corrections: [correction, { ...correction, studentName: "Aluno 02" }] }).success, true);
assert.equal(externalCorrectionBatchSchema.safeParse({ corrections: Array(101).fill(correction) }).success, false, "Um lote precisa ter limite explícito.");

console.log("Contratos de persistência do corretor universal: OK");
