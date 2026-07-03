import type {
  AnswerKey,
  ClassRoom,
  CorrectionSession,
  DashboardMetric,
  Exam,
  ExamCorrectionRule,
  Student,
  TeacherProfile,
} from "@/types/domain";
import {
  answerKeys,
  classAverages,
  classes,
  correctionRules,
  correctionSessions,
  errorRanking,
  exams,
  gradeEvolution,
  students,
  teacherProfile,
} from "@/lib/mock-data";

export const APP_DATA_STORAGE_KEY = "provascan-app-data";
export const APP_SESSION_STORAGE_KEY = "provascan-session";

export type AppDataState = {
  answerKeys: AnswerKey[];
  classes: ClassRoom[];
  correctionRules: ExamCorrectionRule[];
  corrections: CorrectionSession[];
  exams: Exam[];
  students: Student[];
  teacherProfile: TeacherProfile;
};

export const defaultAppData: AppDataState = {
  answerKeys,
  classes,
  correctionRules,
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
  outcomeBreakdown: Array<{ label: string; total: number }>;
  studentRanking: Array<{ aluno: string; nota: number; percentual: number }>;
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
      outcomeBreakdown: [
        { label: "Acertos", total: 0 },
        { label: "Erros", total: 0 },
        { label: "Em branco", total: 0 },
        { label: "Multiplas", total: 0 },
        { label: "Anuladas", total: 0 },
      ],
      studentRanking: [],
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
        turma: item.nome.replace(" Ensino Médio", "").replace("º Ano", "").replace(" Ano", ""),
        media,
      };
    })
    .filter((item): item is { turma: string; media: number } => Boolean(item));

  const questionMap = new Map<number, number>();
  for (const correction of data.corrections) {
    for (const answer of correction.respostas) {
      if (answer.status === "erro" || answer.status === "multipla-marcacao" || answer.status === "em-branco") {
        questionMap.set(answer.questao, (questionMap.get(answer.questao) ?? 0) + 1);
      }
    }
  }

  const computedErrorRanking = [...questionMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
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
    .slice(-6)
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
        trend: `${data.correctionRules.length} regras salvas`,
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
    outcomeBreakdown: [
      {
        label: "Acertos",
        total: data.corrections.reduce((sum, item) => sum + item.correction.acertos, 0),
      },
      {
        label: "Erros",
        total: data.corrections.reduce((sum, item) => sum + item.correction.erros, 0),
      },
      {
        label: "Em branco",
        total: data.corrections.reduce((sum, item) => sum + item.correction.emBranco, 0),
      },
      {
        label: "Multiplas",
        total: data.corrections.reduce((sum, item) => sum + item.correction.multiplasMarcacoes, 0),
      },
      {
        label: "Anuladas",
        total: data.corrections.reduce((sum, item) => sum + item.correction.anuladas, 0),
      },
    ],
    studentRanking: [...data.corrections]
      .sort((a, b) => b.correction.nota - a.correction.nota)
      .slice(0, 6)
      .map((item) => ({
        aluno: item.aluno.nome,
        nota: item.correction.nota,
        percentual: item.correction.percentual,
      })),
  };
}
