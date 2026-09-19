import type { CorrectionSession } from "@/types/domain";

export type QuestionPerformanceRow = {
  blank: number;
  correct: number;
  correctRate: number;
  multiple: number;
  question: number;
  total: number;
  wrong: number;
};

export function buildCorrectionCsv(records: CorrectionSession[]) {
  const rows = [
    ["prova", "turma", "aluno", "data", "nota", "aproveitamento_percentual", "acertos", "erros", "em_branco", "multiplas_marcacoes", "anuladas", "metodo"],
    ...records.map((record) => [
      record.prova.titulo,
      record.turma.nome,
      record.aluno.nome,
      record.correction.data,
      record.correction.nota,
      record.correction.percentual,
      record.correction.acertos,
      record.correction.erros,
      record.correction.emBranco,
      record.correction.multiplasMarcacoes,
      record.correction.anuladas,
      record.correction.metodoIdentificacao,
    ]),
  ];

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function buildQuestionPerformance(records: CorrectionSession[]): QuestionPerformanceRow[] {
  const rows = new Map<number, Omit<QuestionPerformanceRow, "correctRate" | "question">>();

  for (const correction of records) {
    for (const answer of correction.respostas) {
      const row = rows.get(answer.questao) ?? { blank: 0, correct: 0, multiple: 0, total: 0, wrong: 0 };
      row.total += 1;
      if (answer.status === "acerto") row.correct += 1;
      else if (answer.status === "em-branco") row.blank += 1;
      else if (answer.status === "multipla-marcacao") row.multiple += 1;
      else if (answer.status === "erro") row.wrong += 1;
      rows.set(answer.questao, row);
    }
  }

  return [...rows.entries()]
    .map(([question, row]) => ({
      ...row,
      correctRate: row.total ? Math.round((row.correct / row.total) * 100) : 0,
      question,
    }))
    .sort((left, right) => left.correctRate - right.correctRate || left.question - right.question);
}

export function buildQuestionPerformanceCsv(rows: QuestionPerformanceRow[]) {
  const csvRows = [
    ["questao", "respostas", "acertos", "erros", "em_branco", "multiplas_marcacoes", "aproveitamento_percentual"],
    ...rows.map((row) => [row.question, row.total, row.correct, row.wrong, row.blank, row.multiple, row.correctRate]),
  ];
  return `\uFEFF${csvRows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
