import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createExamPrintDocument, getAnswerSheetLabels } from "../lib/exam-print-document";
import { getStudentCardPrintLayout, sortStudentsForPrinting } from "../services/exam-printing";
import type { TeacherExam } from "../types/teacher-exams";

const students = sortStudentsForPrinting(
  [
    { id: "1", nome: "Zoé", turma: "b", status: "Ativo" },
    { id: "2", nome: "Ana", turma: "a", status: "Ativo" },
    { id: "3", nome: "Bruno", turma: "a", status: "Inativo" },
  ],
  [{ id: "a", nome: "2º ano A", ano: "2026" }, { id: "b", nome: "2º ano B", ano: "2026" }],
);
assert.deepEqual(students.map((item) => item.nome), ["Ana", "Zoé"]);

const fortyFive = getStudentCardPrintLayout(45, ["A", "B", "C", "D", "E"]);
assert.equal(fortyFive.columnCount, 3);
assert.equal(fortyFive.rowsPerColumn, 15);
assert.ok(fortyFive.bubbleSize >= 5);
const sixty = getStudentCardPrintLayout(60, ["A", "B", "C", "D", "E"]);
assert.equal(sixty.columnCount, 3);
assert.equal(sixty.rowsPerColumn, 20);
assert.ok(sixty.bubbleSize >= 5);

assert.deepEqual(getAnswerSheetLabels(), ["A", "B", "C", "D", "E"]);
const printableExam = {
  audienceLabel: "2º ano",
  examDate: "2026-09-18",
  questions: [{ alternatives: ["Texto longo A", "Texto longo B", "Texto longo C", "Texto longo D", "Texto longo E"], prompt: "Este enunciado não pode aparecer no cartão." }],
  subject: "História",
  title: "Avaliação teste",
} as TeacherExam;
const cardDocument = createExamPrintDocument(printableExam, "cartao");
assert.match(cardDocument, /answer-card__bubble/);
assert.match(cardDocument, /<span>A<\/span>/);
assert.match(cardDocument, /<span>E<\/span>/);
assert.doesNotMatch(cardDocument, /Texto longo A|Este enunciado não pode aparecer no cartão/);

const workspace = readFileSync(new URL("../components/teacher-exams-workspace.tsx", import.meta.url), "utf8");
assert.match(workspace, /Gerar cartão-resposta/);
assert.match(workspace, /openExamPrint/);
assert.match(workspace, /PrintStudio/);
assert.doesNotMatch(workspace, /Enviar para conferência/);
console.log("Teacher-owned exam printing checks passed.");
