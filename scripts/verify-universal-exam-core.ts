import assert from "node:assert/strict";
import {
  buildExamStructure,
  classifyUniversalMarks,
  gradeObjectiveAnswers,
  inferSubjectsFromText,
  normalizeAnswerKey,
  validateExamStructure,
} from "../services/universal-exam-core";

for (const subjectCount of [1, 4, 5, 6]) {
  const questionCounts = Array.from({ length: subjectCount }, (_, index) => index + 3);
  const structure = buildExamStructure({
    alternativeCount: 5,
    subjectNames: questionCounts.map((_, index) => `Matéria ${index + 1}`),
    questionsPerSubject: questionCounts,
  });

  assert.equal(structure.subjects.length, subjectCount);
  assert.equal(structure.totalQuestions, questionCounts.reduce((sum, value) => sum + value, 0));
  assert.deepEqual(
    structure.subjects.map((subject) => subject.questionEnd - subject.questionStart + 1),
    questionCounts,
    `${subjectCount} matérias devem aceitar quantidades diferentes de questões`,
  );
  assert.deepEqual(validateExamStructure(structure), []);
}

const trueFalse = buildExamStructure({ alternativeCount: 2, subjectNames: ["Geral"], questionsPerSubject: [12] });
assert.deepEqual(trueFalse.alternatives, ["V", "F"]);

assert.deepEqual(inferSubjectsFromText("PORTUGUÊS 1-10\nMATEMÁTICA 11 a 25\nHISTÓRIA 26–30", 30), [
  { id: "subject-1", name: "PORTUGUÊS", questionEnd: 10, questionStart: 1 },
  { id: "subject-2", name: "MATEMÁTICA", questionEnd: 25, questionStart: 11 },
  { id: "subject-3", name: "HISTÓRIA", questionEnd: 30, questionStart: 26 },
]);
assert.deepEqual(inferSubjectsFromText("Documento sem intervalos confiáveis", 40), []);

assert.deepEqual(classifyUniversalMarks([0.08, 0.09, 0.07, 0.1]), {
  confidence: 0.9,
  markedIndexes: [],
  status: "blank",
});
assert.deepEqual(classifyUniversalMarks([0.1, 0.91, 0.12, 0.88]), {
  confidence: 0.9,
  markedIndexes: [1, 3],
  status: "multiple_marks",
});
assert.equal(classifyUniversalMarks([0.1, 0.53, 0.12, 0.11]).status, "uncertain");
assert.equal(classifyUniversalMarks([0.1, 0.83, 0.12, 0.44]).status, "erasure_suspected");
assert.deepEqual(classifyUniversalMarks([0.1, 0.94, 0.12, 0.11]), {
  confidence: 0.94,
  markedIndexes: [1],
  status: "marked",
});

const answerKey = normalizeAnswerKey("1 A\n2 B\n3 D\n4 C", ["A", "B", "C", "D"], 4);
assert.deepEqual(answerKey, ["A", "B", "D", "C"]);
assert.throws(() => normalizeAnswerKey("1 A\n2 X", ["A", "B", "C", "D"], 2), /Questão 2/);

const grade = gradeObjectiveAnswers({
  answerKey,
  answers: [
    { confidence: 0.97, detectedAnswers: ["A"], question: 1, status: "marked" },
    { confidence: 0.95, detectedAnswers: ["C"], question: 2, status: "marked" },
    { confidence: 0.91, detectedAnswers: [], question: 3, status: "blank" },
    { confidence: 0.92, detectedAnswers: ["B", "C"], question: 4, status: "multiple_marks" },
  ],
  maxScore: 10,
});
assert.deepEqual(grade.summary, { blank: 1, correct: 1, incorrect: 1, multipleMarks: 1, review: 1, score: 2.5 });
assert.deepEqual(grade.reviewQuestions, [4]);

console.log("Núcleo do corretor universal validado: estruturas de 1/4/5/6 matérias, marcações e nota.");
