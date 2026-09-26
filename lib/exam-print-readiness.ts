import type { ExamPrintKind } from "@/lib/exam-print-document";
import type { ExamPrintOptions } from "@/lib/exam-print-options";
import { ANSWER_SHEET_TEMPLATE, getBubbleBounds, getQuestionLayout } from "@/services/answer-sheet-template";
import { calculateFanucchiAnswerSheetLayout } from "@/services/fanucchi-answer-sheet";
import type { TeacherExam } from "@/types/teacher-exams";

/** Checks content and shared print/reader geometry without changing either template. */
export function getExamPrintReadiness(exam: TeacherExam, kind: ExamPrintKind, options: ExamPrintOptions) {
  const issues: string[] = [];
  const count = exam.questions.length;
  if (!count) issues.push("Adicione pelo menos uma questão antes de imprimir.");
  if (exam.needsReview) issues.push("Conclua a revisão da prova antes de imprimir.");
  if (kind === "prova") return { ready: issues.length === 0, issues };

  if (count > 90) issues.push("O cartão-resposta aceita até 90 questões por folha. Divida esta prova antes de imprimir o cartão ou o gabarito.");
  exam.questions.forEach((question, index) => {
    const number = index + 1;
    if (question.type !== "multipla_escolha" && question.type !== "verdadeiro_falso") {
      issues.push(`Questão ${number}: este cartão aceita apenas questões de marcar alternativas.`);
    }
    const alternatives = question.alternatives.filter((value) => value.trim());
    if (alternatives.length < 2 || alternatives.length > 5 || alternatives.length !== question.alternatives.length) {
      issues.push(`Questão ${number}: confira as alternativas (de 2 a 5, sem campos vazios).`);
    }
    if (question.needsReview) issues.push(`Questão ${number}: conclua a revisão antes de imprimir.`);
    if (!question.annulled && (question.correctAnswers.length !== 1 || !alternatives.includes(question.correctAnswers[0]))) {
      issues.push(`Questão ${number}: escolha uma única resposta correta entre as alternativas.`);
    }
  });

  if (count > 0 && count <= 90 && kind === "cartao") {
    try {
      if (options.answerSheetModel === "fanucchi") {
        calculateFanucchiAnswerSheetLayout(count);
      } else {
        const labels = ["A", "B", "C", "D", "E"];
        const layout = getQuestionLayout(count, labels);
        const area = ANSWER_SHEET_TEMPLATE.answerArea;
        const left = area.x * ANSWER_SHEET_TEMPLATE.page.width;
        const top = area.y * ANSWER_SHEET_TEMPLATE.page.height;
        const right = left + area.width * ANSWER_SHEET_TEMPLATE.page.width;
        const bottom = top + area.height * ANSWER_SHEET_TEMPLATE.page.height;
        const printedBubbleDiameter = Math.max(14, Math.round(layout.bubbleRadius * 2));
        if (layout.rowHeight < printedBubbleDiameter || layout.bubbleGap < printedBubbleDiameter) throw new Error("As bolhas não cabem sem sobreposição.");
        for (let index = 0; index < count; index += 1) {
          const bubbles = getBubbleBounds({ alternatives: labels, canvasHeight: ANSWER_SHEET_TEMPLATE.page.height, canvasWidth: ANSWER_SHEET_TEMPLATE.page.width, questionCount: count, questionIndex: index });
          if (bubbles.length !== labels.length || bubbles.some((bubble, labelIndex) =>
            bubble.alternative !== labels[labelIndex] || bubble.cx - printedBubbleDiameter / 2 < left || bubble.cx + printedBubbleDiameter / 2 > right || bubble.cy - printedBubbleDiameter / 2 < top || bubble.cy + printedBubbleDiameter / 2 > bottom)) {
            throw new Error("Uma bolha está fora da área de leitura.");
          }
        }
      }
    } catch {
      issues.push("O cartão não cabe com segurança no modelo escolhido. Revise a quantidade de questões.");
    }
  }

  return { ready: issues.length === 0, issues };
}
