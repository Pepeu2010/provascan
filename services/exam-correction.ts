import { createId } from "@/lib/app-data";
import { correctionSessions } from "@/lib/mock-data";
import type {
  AnnulledQuestionMode,
  AnswerKey,
  ClassRoom,
  CorrectionAnswer,
  CorrectionAnswerStatus,
  CorrectionMethod,
  CorrectionSession,
  Exam,
  ExamCorrectionRule,
  Student,
} from "@/types/domain";

export type ReviewAnswerInput = {
  marcacoes: string[];
  questao: number;
};

export function buildDefaultCorrectionRule(exam: Exam): ExamCorrectionRule {
  return {
    provaId: exam.id,
    notaMaxima: 10,
    arredondamentoCasas: 1,
    pesoPadrao: 1,
    pesosPorQuestao: [],
    questoesAnuladas: [],
    modoQuestaoAnulada: "full-credit",
  };
}

export function getCorrectionRule(exam: Exam, rules: ExamCorrectionRule[]) {
  return rules.find((item) => item.provaId === exam.id) ?? buildDefaultCorrectionRule(exam);
}

export function sanitizeQuestionList(raw: string, totalQuestions: number) {
  return [
    ...new Set(
      raw
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item >= 1 && item <= totalQuestions),
    ),
  ].sort((a, b) => a - b);
}

export function sanitizeWeights(raw: string, totalQuestions: number) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/[=:;-]/))
    .map(([question, weight]) => ({
      peso: Number(String(weight ?? "").replace(",", ".")),
      questao: Number(question),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.peso) &&
        item.peso > 0 &&
        Number.isInteger(item.questao) &&
        item.questao >= 1 &&
        item.questao <= totalQuestions,
    )
    .sort((a, b) => a.questao - b.questao);
}

export function buildIdentificationCode(exam: Exam, student: Student) {
  return `${exam.codigo}-${student.matricula}-${student.id}`;
}

export function buildQrPayload(exam: Exam, student: Student, turma: ClassRoom) {
  return JSON.stringify({
    alunoId: student.id,
    correctionCode: buildIdentificationCode(exam, student),
    provaId: exam.id,
    turma: turma.id,
  });
}

export function buildAnswerSheetModel(params: {
  exam: Exam;
  teacherName: string;
  teacherSchool: string;
  turma: ClassRoom;
  student?: Student | null;
}) {
  const { exam, student, teacherName, teacherSchool, turma } = params;
  const uniqueCode = student ? buildIdentificationCode(exam, student) : `${exam.codigo}-EM-BRANCO`;

  return {
    examCode: exam.codigo,
    examTitle: exam.titulo,
    instructions: [
      "Use caneta azul ou preta.",
      "Preencha completamente a bolinha.",
      "Não marque mais de uma alternativa por questão.",
      "Não dobre a área do código de identificação.",
    ],
    qrPayload: student ? buildQrPayload(exam, student, turma) : "",
    questionNumbers: Array.from({ length: exam.quantidadeQuestoes }, (_, index) => index + 1),
    studentName: student?.nome ?? "____________________________",
    studentRegistration: student?.matricula ?? "________________",
    teacherName,
    teacherSchool,
    turmaName: turma.nome,
    uniqueCode,
  };
}

function getQuestionWeight(rule: ExamCorrectionRule, question: number) {
  return rule.pesosPorQuestao.find((item) => item.questao === question)?.peso ?? rule.pesoPadrao;
}

function resolveAnswerStatus(params: {
  correctAnswer: string;
  marcacoes: string[];
  question: number;
  rule: ExamCorrectionRule;
}): CorrectionAnswerStatus {
  const { correctAnswer, marcacoes, question, rule } = params;

  if (rule.questoesAnuladas.includes(question)) {
    return "anulada";
  }

  if (!marcacoes.length) {
    return "em-branco";
  }

  if (marcacoes.length > 1) {
    return "multipla-marcacao";
  }

  return marcacoes[0] === correctAnswer ? "acerto" : "erro";
}

function scoreAnswer(params: {
  mode: AnnulledQuestionMode;
  peso: number;
  status: CorrectionAnswerStatus;
}) {
  const { mode, peso, status } = params;

  if (status === "acerto") {
    return peso;
  }

  if (status === "anulada") {
    return mode === "full-credit" ? peso : 0;
  }

  return 0;
}

export function buildCorrectionSession(params: {
  answerKey: AnswerKey[];
  answers: ReviewAnswerInput[];
  classes: ClassRoom[];
  confidence: number;
  exams: Exam[];
  imageLabel: string;
  method: CorrectionMethod;
  notes?: string[];
  rules: ExamCorrectionRule[];
  student: Student;
}): CorrectionSession {
  const { answerKey, answers, classes, confidence, exams, imageLabel, method, notes = [], rules, student } = params;
  const exam = exams.find((item) => item.id === answerKey[0]?.provaId);
  const turma = classes.find((item) => item.id === student.turma);

  if (!exam || !turma) {
    throw new Error("Não foi possível localizar prova ou turma para salvar a correção.");
  }

  const rule = getCorrectionRule(exam, rules);
  const normalizedAnswers = answerKey
    .sort((a, b) => a.questao - b.questao)
    .map((item) => {
      const review = answers.find((answer) => answer.questao === item.questao);
      const marcacoes = (review?.marcacoes ?? []).filter(Boolean);
      const peso = getQuestionWeight(rule, item.questao);
      const status = resolveAnswerStatus({
        correctAnswer: item.respostaCorreta,
        marcacoes,
        question: item.questao,
        rule,
      });

      return {
        marcacoes,
        peso,
        pontuacao: scoreAnswer({
          mode: rule.modoQuestaoAnulada,
          peso,
          status,
        }),
        questao: item.questao,
        respostaAluno: marcacoes.join("/") || "Em branco",
        respostaCorreta: item.respostaCorreta,
        status,
      } satisfies CorrectionAnswer;
    });

  const rawScore = normalizedAnswers.reduce((sum, answer) => sum + answer.pontuacao, 0);
  const maxScoreBase = normalizedAnswers.reduce((sum, answer) => {
    if (answer.status === "anulada" && rule.modoQuestaoAnulada === "ignore") {
      return sum;
    }
    return sum + answer.peso;
  }, 0);
  const percentual = maxScoreBase ? Math.round((rawScore / maxScoreBase) * 100) : 0;
  const multiplier = 10 ** rule.arredondamentoCasas;
  const nota = maxScoreBase
    ? Math.round(((rawScore / maxScoreBase) * rule.notaMaxima) * multiplier) / multiplier
    : 0;
  const now = new Date();

  const acertos = normalizedAnswers.filter((item) => item.status === "acerto").length;
  const erros = normalizedAnswers.filter((item) => item.status === "erro").length;
  const emBranco = normalizedAnswers.filter((item) => item.status === "em-branco").length;
  const multiplasMarcacoes = normalizedAnswers.filter((item) => item.status === "multipla-marcacao").length;
  const anuladas = normalizedAnswers.filter((item) => item.status === "anulada").length;
  const uniqueCode = buildIdentificationCode(exam, student);

  return {
    aluno: student,
    confiancaOcr: confidence,
    correction: {
      acertos,
      alunoId: student.id,
      anuladas,
      data: now.toISOString(),
      emBranco,
      erros,
      id: createId("C"),
      imagem: imageLabel,
      metodoIdentificacao: method,
      multiplasMarcacoes,
      nomeDetectado: student.nome,
      nota,
      percentual,
      provaId: exam.id,
      tempoCorrecao: "manual",
    },
    identificacao: {
      method,
      qrCode: buildQrPayload(exam, student, turma),
      uniqueCode,
    },
    imagemProcessada: "Leitura revisada manualmente antes do salvamento final.",
    observacoes: notes.length ? notes : ["Correção salva manualmente pelo professor."],
    prova: exam,
    respostas: normalizedAnswers,
    turma,
  };
}

export async function analyzeAnswerSheet() {
  return correctionSessions[0];
}
