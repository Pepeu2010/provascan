import assert from "node:assert/strict";
import { buildOrderedAnswerKey, sortStudentsForPrinting } from "../services/collaborative-printing";

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
console.log("Collaborative printing checks passed.");
