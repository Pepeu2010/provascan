import assert from "node:assert/strict";
import { buildExternalCorrectionCsv, buildExternalReport, filterExternalCorrections } from "../lib/external-reporting";
import { DEFAULT_UNIVERSAL_GRADING_RULES } from "../services/universal-grading-rules";
import type { ExternalCorrectionRecord } from "../types/universal-exams";

const structure = { alternatives: ["A", "B"], columnCount: 1, confidence: 1, source: "manual" as const, subjects: [{ id: "p", name: "Português", questionStart: 1, questionEnd: 1 }, { id: "m", name: "Matemática", questionStart: 2, questionEnd: 2 }], totalQuestions: 2 };
const make = (id: string, name: string, score: number, answers: string[], date: string): ExternalCorrectionRecord => ({
  answerKey: ["A", "B"], answers: answers.map((answer, index) => ({ confidence: 1, detectedAnswers: [answer], question: index + 1, status: "marked" })), correctedAt: date,
  gradingRules: DEFAULT_UNIVERSAL_GRADING_RULES, id, reviewAudit: [], sourceLabel: `${name}, prova.pdf`, studentName: name, structure,
  summary: { blank: 0, correct: score === 10 ? 2 : 1, incorrect: score === 10 ? 0 : 1, multipleMarks: 0, review: 0, score }, templateId: id === "1" ? "template-a" : null,
});
const records = [make("1", "Ana", 10, ["A", "B"], "2026-09-14T10:00:00.000Z"), make("2", "Bruno", 5, ["A", "A"], "2026-09-10T10:00:00.000Z")];
assert.deepEqual(filterExternalCorrections(records, { dateFrom: "2026-09-12", dateTo: "", query: "ana", templateId: "all" }).map((item) => item.id), ["1"]);
const report = buildExternalReport(records);
assert.equal(report.averageScore, 7.5);
assert.deepEqual(report.questions.map((item) => item.correctRate), [100, 50]);
assert.deepEqual(report.subjects.map((item) => [item.name, item.averageScore]), [["Português", 10], ["Matemática", 5]]);
assert.match(buildExternalCorrectionCsv(records), /"Ana","Ana, prova.pdf"/);

console.log("External reporting verification passed.");
