import type {
  AnswerKey,
  ClassRoom,
  CorrectionSession,
  CorrectionSummary,
  DashboardMetric,
  Exam,
  Student,
  TeacherProfile,
} from "@/types/domain";
import {
  answerKeys,
  classAverages,
  classes,
  correctionSessions,
  errorRanking,
  exams,
  gradeEvolution,
  students,
  teacherProfile,
} from "@/lib/mock-data";

export const APP_DATA_STORAGE_KEY = "provascan-app-data";

export type AppDataState = {
  answerKeys: AnswerKey[];
  classes: ClassRoom[];
  corrections: CorrectionSession[];
  exams: Exam[];
  students: Student[];
  teacherProfile: TeacherProfile;
};

export const defaultAppData: AppDataState = {
  answerKeys,
  classes,
  corrections: correctionSessions,
  exams,
  students,
  teacherProfile,
};

export type AnalyticsSnapshot = {
  classAverages: Array<{ turma: string; media: number }>;
  dashboardMetrics: DashboardMetric[];
  errorRanking: Array<{ questao: string; erros: number }>;
  gradeEvolution: Array<{ periodo: string; media: number }>;
};

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function cloneDefaultAppData(): AppDataState {
  return JSON.parse(JSON.stringify(defaultAppData)) as AppDataState;
}

export function getClassLabel(classesList: ClassRoom[], classId: string) {
  return classesList.find((item) => item.id === classId)?.nome ?? "Sem turma";
}

export function calculateAnalytics(data: AppDataState): AnalyticsSnapshot {
  if (!data.corrections.length) {
    return {
      classAverages,
      dashboardMetrics: [
        {
          label: "Alunos ativos",
          value: String(data.students.filter((item) => item.status === "Ativo").length),
          helper: `${data.classes.length} turmas cadastradas`,
          trend: "Dados locais",
        },
        {
          label: "Provas criadas",
          value: String(data.exams.length),
          helper: `${data.answerKeys.length} respostas no gabarito`,
          trend: "Modo operacional local",
        },
        {
          label: "Correções salvas",
          value: "0",
          helper: "Ainda sem histórico",
          trend: "Pronto para começar",
        },
        {
          label: "Média geral",
          value: "0%",
          helper: "Sem correções concluídas",
          trend: "Aguardando uso",
        },
      ],
      errorRanking,
      gradeEvolution,
    };
  }

  const activeStudents = data.students.filter((item) => item.status === "Ativo").length;
  const totalQuestions = data.answerKeys.length || data.exams.reduce((sum, exam) => sum + exam.quantidadeQuestoes, 0);
  const avgPercent =
    Math.round(
      data.corrections.reduce((sum, item) => sum + item.correction.percentual, 0) / data.corrections.length,
    ) || 0;

  const correctionsByClass = data.classes
    .map((item) => {
      const items = data.corrections.filter((correction) => correction.turma.id === item.id);
      if (!items.length) {
        return null;
      }

      const media = Math.round(
        items.reduce((sum, correction) => sum + correction.correction.percentual, 0) / items.length,
      );

      return {
        turma: item.nome.replace(" Ensino Médio", "").replace(" Ano", ""),
        media,
      };
    })
    .filter((item): item is { turma: string; media: number } => Boolean(item));

  const questionMap = new Map<number, number>();
  for (const correction of data.corrections) {
    for (const answer of correction.respostas) {
      if (answer.resultado === "erro") {
        questionMap.set(answer.questao, (questionMap.get(answer.questao) ?? 0) + 1);
      }
    }
  }

  const computedErrorRanking = [...questionMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([questao, erros]) => ({
      questao: `Q${String(questao).padStart(2, "0")}`,
      erros,
    }));

  const groupedByDate = new Map<string, number[]>();
  for (const correction of data.corrections) {
    const date = correction.correction.data.slice(0, 10);
    const bucket = groupedByDate.get(date) ?? [];
    bucket.push(correction.correction.percentual);
    groupedByDate.set(date, bucket);
  }

  const computedGradeEvolution = [...groupedByDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-4)
    .map(([date, values]) => ({
      periodo: new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }),
      media: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
    }));

  const latestDate = [...data.corrections]
    .map((item) => item.correction.data.slice(0, 10))
    .sort()
    .at(-1);
  const correctionsToday = latestDate
    ? data.corrections.filter((item) => item.correction.data.startsWith(latestDate)).length
    : 0;
  const avgTimeSeconds = Math.round(
    data.corrections.reduce((sum, item) => sum + Number.parseInt(item.correction.tempoCorrecao, 10), 0) /
      data.corrections.length,
  );

  return {
    classAverages: correctionsByClass.length ? correctionsByClass : classAverages,
    dashboardMetrics: [
      {
        label: "Alunos ativos",
        value: String(activeStudents),
        helper: `${data.classes.length} turmas cadastradas`,
        trend: `${data.students.length - activeStudents} inativos/transferidos`,
      },
      {
        label: "Provas criadas",
        value: String(data.exams.length),
        helper: `${totalQuestions} respostas em gabaritos`,
        trend: `${data.answerKeys.length} linhas salvas`,
      },
      {
        label: "Correções salvas",
        value: String(correctionsToday),
        helper: `Histórico total ${data.corrections.length}`,
        trend: `Tempo médio ${avgTimeSeconds || 0}s`,
      },
      {
        label: "Média geral",
        value: `${avgPercent}%`,
        helper: "Com base nas correções registradas",
        trend: "Atualizado em tempo real",
      },
    ],
    errorRanking: computedErrorRanking.length ? computedErrorRanking : errorRanking,
    gradeEvolution: computedGradeEvolution.length ? computedGradeEvolution : gradeEvolution,
  };
}

export function createCorrectionSession(params: {
  answerKey: AnswerKey[];
  answers: string[];
  classes: ClassRoom[];
  exams: Exam[];
  imageLabel: string;
  notes?: string[];
  student: Student;
}): CorrectionSession {
  const { answerKey, answers, classes: classesList, exams: examsList, imageLabel, notes = [], student } = params;
  const exam = examsList.find((item) => item.id === answerKey[0]?.provaId);
  const turma = classesList.find((item) => item.id === student.turma);

  if (!exam || !turma) {
    throw new Error("Não foi possível localizar prova ou turma para salvar a correção.");
  }

  const respostas = answerKey.map((item, index) => {
    const respostaAluno = answers[index] ?? "";
    return {
      questao: item.questao,
      respostaAluno,
      respostaCorreta: item.respostaCorreta,
      resultado: respostaAluno === item.respostaCorreta ? "acerto" : "erro",
    } as const;
  });

  const acertos = respostas.filter((item) => item.resultado === "acerto").length;
  const erros = respostas.length - acertos;
  const percentual = respostas.length ? Math.round((acertos / respostas.length) * 100) : 0;
  const nota = Number(((percentual / 100) * 10).toFixed(1));
  const now = new Date();
  const summary: CorrectionSummary = {
    id: createId("C"),
    provaId: exam.id,
    alunoId: student.id,
    nomeDetectado: student.nome,
    nota,
    acertos,
    erros,
    percentual,
    data: now.toISOString(),
    imagem: imageLabel,
    tempoCorrecao: "manual",
  };

  return {
    correction: summary,
    aluno: student,
    prova: exam,
    turma,
    respostas,
    confiancaOcr: 0,
    imagemProcessada: "Correção registrada em modo operacional local.",
    observacoes: notes.length ? notes : ["Correção salva manualmente pelo professor."],
  };
}
