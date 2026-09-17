import type { TeacherExam, TeacherExamQuestion } from "@/types/teacher-exams";

export type AnswerKeyReadiness = "todos" | "prontos" | "incompletos" | "aplicados" | "arquivados";

export type AnswerKeyFilters = {
  query: string;
  readiness: AnswerKeyReadiness;
  subject: string;
};

export function questionHasAnswer(question: TeacherExamQuestion) {
  if (question.annulled) return true;
  if (question.type === "multipla_escolha" || question.type === "verdadeiro_falso") {
    return question.correctAnswers.some((answer) => answer.trim().length > 0) && !question.needsReview;
  }
  return question.correctionCriteria.trim().length > 0 && !question.needsReview;
}

export function buildAnswerKeySummary(exam: TeacherExam) {
  const answered = exam.questions.filter(questionHasAnswer).length;
  const questionCount = exam.questions.length;
  return {
    annulled: exam.questions.filter((question) => question.annulled).length,
    answered,
    complete: questionCount > 0 && answered === questionCount && !exam.needsReview,
    pending: Math.max(0, questionCount - answered),
    questionCount,
    totalWeight: exam.questions.reduce((total, question) => total + question.weight, 0),
  };
}

export function filterAnswerKeyExams(exams: TeacherExam[], filters: AnswerKeyFilters) {
  const normalizedQuery = filters.query.trim().toLocaleLowerCase("pt-BR");
  return exams.filter((exam) => {
    const summary = buildAnswerKeySummary(exam);
    if (filters.subject !== "todas" && exam.subject !== filters.subject) return false;
    if (filters.readiness === "prontos" && (!summary.complete || exam.status === "rascunho" || exam.status === "arquivada")) return false;
    if (filters.readiness === "incompletos" && summary.complete && !exam.needsReview) return false;
    if (filters.readiness === "aplicados" && exam.status !== "aplicada") return false;
    if (filters.readiness === "arquivados" && exam.status !== "arquivada") return false;
    if (filters.readiness !== "arquivados" && filters.readiness !== "todos" && exam.status === "arquivada") return false;
    if (!normalizedQuery) return true;
    return `${exam.title} ${exam.subject} ${exam.audienceLabel} ${exam.creatorName}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
  });
}
