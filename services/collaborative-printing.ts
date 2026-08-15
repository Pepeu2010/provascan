import type { ClassRoom, Student } from "@/types/domain";

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
