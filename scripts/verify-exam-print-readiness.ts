import assert from "node:assert/strict";
import { createExamPrintDocument } from "../lib/exam-print-document";
import { getExamPrintReadiness } from "../lib/exam-print-readiness";
import { defaultExamPrintOptions } from "../lib/exam-print-options";
import { ANSWER_SHEET_TEMPLATE, getBubbleBounds } from "../services/answer-sheet-template";
import { calculateFanucchiAnswerSheetLayout } from "../services/fanucchi-answer-sheet";
import type { TeacherExam } from "../types/teacher-exams";

const letters = ["A", "B", "C", "D", "E"];
function fixture(questionCount: number): TeacherExam {
  return {
    id: "offline-print-fixture",
    title: "Prova sintética — não há alunos reais",
    subject: "Teste",
    groupType: "GERAL",
    audienceLabel: "Turma fictícia",
    examDate: "2026-09-25",
    instructions: "",
    questions: Array.from({ length: questionCount }, (_, index) => ({
      id: `fixture-${index + 1}`,
      position: index + 1,
      type: "multipla_escolha" as const,
      prompt: `Enunciado sintético ${index + 1}`,
      alternatives: letters.map((letter) => `Alternativa ${index + 1}-${letter}`),
      correctAnswers: [`Alternativa ${index + 1}-${letters[index % letters.length]}`],
      annulled: false,
      needsReview: false,
    })),
  } as TeacherExam;
}

for (const count of [10, 45, 60, 90]) {
  const exam = fixture(count);
  const key = createExamPrintDocument(exam, "gabarito");
  const expected = exam.questions.map((_, index) => letters[index % letters.length]);
  const actual = Array.from(key.matchAll(/<li><strong>(\d+)<\/strong><span>([A-E])<\/span><\/li>/g));
  assert.deepEqual(actual.map((entry) => Number(entry[1])), Array.from({ length: count }, (_, index) => index + 1));
  assert.deepEqual(actual.map((entry) => entry[2]), expected);
  assert.doesNotMatch(key, /Enunciado sintético|Alternativa \d+-[A-E]/);

  for (const model of ["provascan", "fanucchi"] as const) {
    const options = { ...defaultExamPrintOptions, answerSheetModel: model };
    assert.deepEqual(getExamPrintReadiness(exam, "cartao", options), { ready: true, issues: [] });
    assert.deepEqual(getExamPrintReadiness(exam, "gabarito", options), { ready: true, issues: [] });
    const card = createExamPrintDocument(exam, "cartao", options);
    assert.doesNotMatch(card, /Enunciado sintético|Alternativa \d+-[A-E]/);
    if (model === "provascan") {
      const restyled = createExamPrintDocument(exam, "cartao", { ...options, template: "simulado", typeface: "serifada", size: "ampliada" });
      assert.equal(restyled, card, "O visual da prova não pode deslocar ou redimensionar o cartão OMR.");
    }
    if (model === "fanucchi") {
      const layout = calculateFanucchiAnswerSheetLayout(count);
      assert.equal(layout.questions.length, count);
      assert.equal((card.match(/class="fanucchi-card__row"/g) ?? []).length, count);
      assert.equal((card.match(/class="fanucchi-card__bubble"/g) ?? []).length, count * 5);
    } else {
      assert.equal((card.match(/class="answer-card__question"/g) ?? []).length, count);
      assert.equal((card.match(/class="answer-card__bubble"/g) ?? []).length, count * 5);
      for (let index = 0; index < count; index += 1) {
        const bounds = getBubbleBounds({ alternatives: letters, canvasWidth: ANSWER_SHEET_TEMPLATE.page.width, canvasHeight: ANSWER_SHEET_TEMPLATE.page.height, questionCount: count, questionIndex: index });
        assert.deepEqual(bounds.map((bubble) => bubble.alternative), letters);
      }
    }
  }
}

const incomplete = fixture(10);
incomplete.questions[2].correctAnswers = [];
assert.match(getExamPrintReadiness(incomplete, "gabarito", defaultExamPrintOptions).issues.join(" "), /Questão 3/);
assert.match(getExamPrintReadiness(incomplete, "cartao", defaultExamPrintOptions).issues.join(" "), /Questão 3/);
incomplete.questions[2].annulled = true;
assert.equal(getExamPrintReadiness(incomplete, "gabarito", defaultExamPrintOptions).ready, true);
assert.match(createExamPrintDocument(incomplete, "gabarito"), /ANULADA/);
incomplete.questions[2].needsReview = true;
assert.equal(getExamPrintReadiness(incomplete, "gabarito", defaultExamPrintOptions).ready, false);
assert.equal(getExamPrintReadiness(fixture(91), "cartao", defaultExamPrintOptions).ready, false);
assert.equal(getExamPrintReadiness(fixture(0), "prova", defaultExamPrintOptions).ready, false);

console.log("Pre-print matrix passed: 10, 45, 60 and 90 synthetic questions, both card models, key mapping and fail-closed content checks. No database writes.");
