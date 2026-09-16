import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getStudentCardPrintLayout, sortStudentsForPrinting } from "../services/exam-printing";

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

const workspace = readFileSync(new URL("../components/teacher-exams-workspace.tsx", import.meta.url), "utf8");
assert.match(workspace, /Gerar cartão-resposta/);
assert.match(workspace, /bubble-row/);
assert.doesNotMatch(workspace, /Enviar para conferência/);
console.log("Teacher-owned exam printing checks passed.");
