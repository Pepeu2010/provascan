import assert from "node:assert/strict";
import { gradeWithRules } from "../services/universal-grading-rules";

const structure = {
  alternatives: ["A", "B", "C", "D"], columnCount: 1, confidence: 1, source: "manual" as const,
  subjects: [
    { id: "language", name: "Português", questionStart: 1, questionEnd: 2 },
    { id: "math", name: "Matemática", questionStart: 3, questionEnd: 4 },
  ], totalQuestions: 4,
};
const answers = [
  { confidence: 1, detectedAnswers: ["A"], question: 1, status: "marked" as const },
  { confidence: 1, detectedAnswers: ["C"], question: 2, status: "marked" as const },
  { confidence: 1, detectedAnswers: ["A", "D"], question: 3, status: "multiple_marks" as const },
  { confidence: 1, detectedAnswers: [], question: 4, status: "blank" as const },
];

const graded = gradeWithRules({
  answerKey: ["A", "B", "C", "D"], answers, structure,
  rules: { annulledPolicy: "full_credit", annulledQuestions: [2], defaultWeight: 1, maxScore: 10, multipleMarksPolicy: "incorrect", questionWeights: { 1: 2 } },
});
assert.equal(graded.reviewQuestions.length, 0);
assert.equal(graded.summary.score, 6);
assert.equal(graded.summary.annulled, 1);
assert.deepEqual(graded.subjects.map((subject) => [subject.name, subject.correct, subject.score]), [["Português", 2, 10], ["Matemática", 0, 0]]);

const needsReview = gradeWithRules({
  answerKey: ["A", "B", "C", "D"], answers, structure,
  rules: { annulledPolicy: "ignore", annulledQuestions: [], defaultWeight: 1, maxScore: 10, multipleMarksPolicy: "review", questionWeights: {} },
});
assert.deepEqual(needsReview.reviewQuestions, [3]);

console.log("Universal grading rules verification passed.");
