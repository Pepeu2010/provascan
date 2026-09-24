import assert from "node:assert/strict";
import { buildCorrectionCsv, buildQuestionPerformance, buildQuestionPerformanceCsv, buildTopicPerformance, buildTopicPerformanceCsv } from "../lib/internal-reporting";
import type { CorrectionSession } from "../types/domain";

const base = {
  aluno: { id: "student-1", nome: "=Ana", status: "Ativo" as const, turma: "2A" },
  confiancaOcr: 0.98,
  correction: { acertos: 1, alunoId: "student-1", anuladas: 0, data: "2026-09-19T10:00:00.000Z", emBranco: 0, erros: 1, id: "correction-1", imagem: "", metodoIdentificacao: "ocr" as const, multiplasMarcacoes: 0, nomeDetectado: "Ana", nota: 5, percentual: 50, provaId: "exam-1", tempoCorrecao: "10s" },
  imagemProcessada: "",
  prova: { alternativas: ["A", "B"], audienceId: "all", audienceLabel: "Geral", codigo: "EXAM-1", data: "2026-09-19", groupType: "GERAL" as const, id: "exam-1", quantidadeQuestoes: 2, questionTopics: { "1": "Sistema Solar", "2": "Sistema Solar" }, status: "publicada" as const, templateVersion: "1", titulo: "Avaliação diagnóstica", yearSegment: "2" as const },
  turma: { ano: "2", id: "class-1", nome: "2º A" },
};
const record: CorrectionSession = {
  ...base,
  identificacao: { method: "ocr", qrCode: "", uniqueCode: "" },
  observacoes: [],
  respostas: [
    { marcacoes: ["A"], peso: 1, pontuacao: 1, questao: 1, respostaAluno: "A", respostaCorreta: "A", status: "acerto" },
    { marcacoes: ["A"], peso: 1, pontuacao: 0, questao: 2, respostaAluno: "A", respostaCorreta: "B", status: "erro" },
  ],
};

const rows = buildQuestionPerformance([record]);
assert.deepEqual(rows.map((row) => [row.question, row.correctRate, row.wrong]), [[2, 0, 1], [1, 100, 0]]);
assert.match(buildCorrectionCsv([record]), /"'=Ana"/);
assert.match(buildQuestionPerformanceCsv(rows), /"questao"/);
const topicRows = buildTopicPerformance([record], [record.prova]);
assert.deepEqual(topicRows.map((row) => [row.topic, row.correctRate, row.questionCount]), [["Sistema Solar", 50, 2]]);
assert.match(buildTopicPerformanceCsv(topicRows), /"conteudo"/);
console.log("Internal reporting verification passed.");
