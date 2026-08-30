import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildOrderedAnswerKey, getStudentCardPrintLayout, sortStudentsForPrinting } from "../services/collaborative-printing";

const ordered = buildOrderedAnswerKey([
  { questionStart: 11, questionCount: 2, answers: ["D", "E"], subject: "Ciências" },
  { questionStart: 1, questionCount: 2, answers: ["B", "A"], subject: "Matemática" },
]);

assert.deepEqual(ordered.map((item) => [item.question, item.answer, item.subject]), [[1, "B", "Matemática"], [2, "A", "Matemática"], [11, "D", "Ciências"], [12, "E", "Ciências"]]);

const students = sortStudentsForPrinting(
  [
    { id: "1", nome: "Zoé", turma: "b", status: "Ativo" },
    { id: "2", nome: "Ana", turma: "a", status: "Ativo" },
    { id: "3", nome: "Bruno", turma: "a", status: "Inativo" },
  ],
  [
    { id: "a", nome: "2º ano A", ano: "2026" },
    { id: "b", nome: "2º ano B", ano: "2026" },
  ],
);

assert.deepEqual(students.map((item) => item.nome), ["Ana", "Zoé"]);

const fortyFiveQuestionLayout = getStudentCardPrintLayout(45, ["A", "B", "C", "D", "E"]);
assert.equal(fortyFiveQuestionLayout.columnCount, 3);
assert.equal(fortyFiveQuestionLayout.rowsPerColumn, 15);
assert.ok(fortyFiveQuestionLayout.bubbleSize >= 5, `As bolhas de 45 questões devem ter ao menos 5 mm; recebido ${fortyFiveQuestionLayout.bubbleSize.toFixed(2)} mm.`);

const sixtyQuestionLayout = getStudentCardPrintLayout(60, ["A", "B", "C", "D", "E"]);
assert.equal(sixtyQuestionLayout.columnCount, 3, "Cartões de 60 questões devem preservar três colunas largas para as cinco alternativas.");
assert.equal(sixtyQuestionLayout.rowsPerColumn, 20, "Cartões de 60 questões devem distribuir as respostas em vinte linhas por coluna.");
assert.ok(sixtyQuestionLayout.bubbleSize >= 5, `As bolhas de 60 questões devem ter ao menos 5 mm; recebido ${sixtyQuestionLayout.bubbleSize.toFixed(2)} mm.`);

const workspace = readFileSync(new URL("../components/collaborative-exams-workspace.tsx", import.meta.url), "utf8");
assert.match(workspace, /class=\"subject-map\"/);
assert.match(workspace, /section\.questionCount} questões/);
assert.match(workspace, /class=\"question-column\"/);
assert.match(workspace, /class=\"question-header\"/);
assert.match(workspace, /getStudentCardPrintLayout\(exam\.questionCount, exam\.alternatives\)/);
assert.match(workspace, /question--section-start/);
assert.doesNotMatch(workspace, /140 \/ Math\.max\(exam\.questionCount, 1\)/);
console.log("Collaborative printing checks passed.");
