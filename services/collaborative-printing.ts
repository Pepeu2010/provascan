import type { ClassRoom, Student } from "@/types/domain";
import { ANSWER_SHEET_TEMPLATE, getQuestionLayout } from "@/services/answer-sheet-template";

type AnswerSection = {
  answers?: string[];
  questionCount: number;
  questionStart: number;
  subject: string;
};

export type OrderedAnswer = {
  answer: string;
  question: number;
  subject: string;
};

export function getStudentCardPrintLayout(questionCount: number, alternatives: string[]) {
  const layout = getQuestionLayout(questionCount, alternatives);
  const pagePixelToMillimeter = 210 / ANSWER_SHEET_TEMPLATE.page.width;

  return {
    answerAreaHeight: ANSWER_SHEET_TEMPLATE.answerArea.height * 297,
    answerAreaLeft: ANSWER_SHEET_TEMPLATE.answerArea.x * 210,
    answerAreaTop: ANSWER_SHEET_TEMPLATE.answerArea.y * 297,
    answerAreaWidth: ANSWER_SHEET_TEMPLATE.answerArea.width * 210,
    bubbleCellWidth: layout.bubbleGap * pagePixelToMillimeter,
    bubbleSize: Math.max(5, layout.bubbleRadius * 2 * pagePixelToMillimeter),
    columnCount: layout.columnCount,
    columnGap: layout.columnGap * pagePixelToMillimeter,
    numberColumnWidth: layout.numberColumnWidth * pagePixelToMillimeter,
    rowRightPadding: 12 * pagePixelToMillimeter,
    rowsPerColumn: layout.rowsPerColumn,
  };
}

export function buildOrderedAnswerKey(sections: AnswerSection[]): OrderedAnswer[] {
  return sections
    .flatMap((section) => Array.from({ length: section.questionCount }, (_, index) => ({
      answer: section.answers?.[index] ?? "",
      question: section.questionStart + index,
      subject: section.subject,
    })))
    .sort((left, right) => left.question - right.question);
}

export function sortStudentsForPrinting(students: Student[], classes: ClassRoom[]): Student[] {
  const className = new Map(classes.map((item) => [item.id, item.nome]));
  return students
    .filter((student) => student.status === "Ativo")
    .sort((left, right) => {
      const classComparison = (className.get(left.turma) ?? "").localeCompare(className.get(right.turma) ?? "", "pt-BR", { numeric: true, sensitivity: "base" });
      return classComparison || left.nome.localeCompare(right.nome, "pt-BR", { sensitivity: "base" });
    });
}
