import { gradeWithRules } from "@/services/universal-grading-rules";
import type { ExternalCorrectionRecord } from "@/types/universal-exams";

export function filterExternalCorrections(records: ExternalCorrectionRecord[], filters: { dateFrom: string; dateTo: string; query: string; templateId: string }) {
  const query = normalize(filters.query);
  return records.filter((record) => {
    const date = record.correctedAt.slice(0, 10);
    if (filters.dateFrom && date < filters.dateFrom) return false;
    if (filters.dateTo && date > filters.dateTo) return false;
    if (filters.templateId !== "all" && (record.templateId ?? "none") !== filters.templateId) return false;
    return !query || normalize(`${record.studentName} ${record.sourceLabel}`).includes(query);
  });
}

export function buildExternalReport(records: ExternalCorrectionRecord[]) {
  const questionMap = new Map<number, { correct: number; total: number }>();
  const subjectMap = new Map<string, number[]>();
  const studentMap = new Map<string, number[]>();
  records.forEach((record) => {
    record.answers.forEach((answer, index) => {
      const current = questionMap.get(answer.question) ?? { correct: 0, total: 0 };
      current.total += 1;
      if (answer.status === "marked" && answer.detectedAnswers[0] === record.answerKey[index]) current.correct += 1;
      questionMap.set(answer.question, current);
    });
    const grade = gradeWithRules({ answerKey: record.answerKey, answers: record.answers, rules: record.gradingRules, structure: record.structure });
    grade.subjects.forEach((subject) => subjectMap.set(subject.name, [...(subjectMap.get(subject.name) ?? []), subject.score]));
    studentMap.set(record.studentName, [...(studentMap.get(record.studentName) ?? []), record.summary.score]);
  });
  return {
    averageScore: average(records.map((record) => record.summary.score)),
    comparisons: [...studentMap].map(([studentName, scores]) => ({ averageScore: average(scores), corrections: scores.length, studentName })).sort((left, right) => right.averageScore - left.averageScore),
    questions: [...questionMap].map(([question, value]) => ({ correctRate: Math.round(value.correct / Math.max(value.total, 1) * 100), question, total: value.total })).sort((left, right) => left.question - right.question),
    subjects: [...subjectMap].map(([name, scores]) => ({ averageScore: average(scores), name })),
  };
}

export function buildExternalCorrectionCsv(records: ExternalCorrectionRecord[]) {
  const rows = [
    ["aluno", "arquivo", "data", "nota", "acertos", "erros", "em_branco", "multiplas", "questoes"],
    ...records.map((record) => [record.studentName, record.sourceLabel, record.correctedAt, record.summary.score, record.summary.correct, record.summary.incorrect, record.summary.blank, record.summary.multipleMarks, record.structure.totalQuestions]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 100) / 100 : 0;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
