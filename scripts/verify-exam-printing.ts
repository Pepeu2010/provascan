import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createExamPrintDocument, createStudentCardsPrintDocument, getAnswerSheetLabels } from "../lib/exam-print-document";
import { defaultExamPrintOptions, normalizeExamPrintOptions } from "../lib/exam-print-options";
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
  instructions: "",
  questions: [{ alternatives: ["Texto longo A", "Texto longo B", "Texto longo C", "Texto longo D", "Texto longo E"], prompt: "Este enunciado não pode aparecer no cartão." }],
  subject: "História",
  title: "Avaliação teste",
} as TeacherExam;
const cardDocument = createExamPrintDocument(printableExam, "cartao");
assert.match(cardDocument, /answer-card__bubble/);
assert.match(cardDocument, /<span>A<\/span>/);
assert.match(cardDocument, /<span>E<\/span>/);
assert.doesNotMatch(cardDocument, /Texto longo A|Este enunciado não pode aparecer no cartão/);

const officialKey = createExamPrintDocument({
  ...printableExam,
  questions: [{ ...printableExam.questions[0], correctAnswers: ["Texto longo B"], annulled: false }],
} as TeacherExam, "gabarito");
assert.match(officialKey, /GABARITO OFICIAL/);
assert.match(officialKey, />B<\/span>/);
assert.doesNotMatch(officialKey, /Este enunciado não pode aparecer no cartão|Texto longo A|Texto longo B/);

const studentCards = createStudentCardsPrintDocument(printableExam, [
  { id: "a", name: "Ana de Souza", className: "2º ano A" },
  { id: "b", name: "Bruno Lima", className: "2º ano B" },
]);
assert.match(studentCards, /Ana de Souza/);
assert.match(studentCards, /Bruno Lima/);
assert.match(studentCards, /answer-card--batch/);
assert.match(studentCards, /page-break-after:always/);
assert.doesNotMatch(studentCards, /Texto longo A|Este enunciado não pode aparecer no cartão/);

const twoColumns = createExamPrintDocument(printableExam, "prova", { ...defaultExamPrintOptions, alternativeLayout: "duas_colunas", template: "classico", typeface: "serifada" });
assert.match(twoColumns, /exam-print__alternatives--duas_colunas/);
assert.match(twoColumns, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.deepEqual(normalizeExamPrintOptions({ template: "compacto", typeface: "didatica", size: "ampliada", alternativeLayout: "duas_colunas" }), { template: "compacto", typeface: "didatica", size: "ampliada", alternativeLayout: "duas_colunas" });
assert.deepEqual(normalizeExamPrintOptions({ template: "fora-do-padrao" }), defaultExamPrintOptions);

const workspace = readFileSync(new URL("../components/teacher-exams-workspace.tsx", import.meta.url), "utf8");
const printStudio = readFileSync(new URL("../components/print-studio.tsx", import.meta.url), "utf8");
assert.match(workspace, /Gerar cartão-resposta/);
assert.match(workspace, /openExamPrint/);
assert.match(workspace, /PrintStudio/);
assert.match(workspace, /ExamPresentationControls/);
assert.match(printStudio, /Visual da prova/);
assert.match(printStudio, /Gabarito oficial/);
assert.match(printStudio, /Cartões por aluno/);
assert.match(printStudio, /print-roster/);
assert.doesNotMatch(workspace, /Enviar para conferência/);
console.log("Teacher-owned exam printing checks passed.");
