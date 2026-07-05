"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  calculateAnalytics,
  cloneDefaultAppData,
  createId,
  type AppDataState,
} from "@/lib/app-data";
import { normalizeClasses, normalizeExams } from "@/lib/exam-audience";
import type { AuthSessionUser } from "@/types/auth";
import {
  buildCorrectionSession,
  buildDefaultCorrectionRule,
  sanitizeQuestionList,
  sanitizeWeights,
  type ReviewAnswerInput,
} from "@/services/exam-correction";
import type {
  AnswerKey,
  ClassRoom,
  CorrectionSession,
  Exam,
  ExamCorrectionRule,
  Student,
  StudentStatus,
  AudienceGroupType,
  YearSegment,
} from "@/types/domain";

type CreateClassInput = {
  ano: string;
  nome: string;
  periodo: string;
  professor: string;
};

type CreateStudentInput = {
  matricula: string;
  nome: string;
  status: StudentStatus;
  turma: string;
};

type CreateExamInput = {
  alternativas: string[];
  audienceId: string;
  audienceLabel: string;
  data: string;
  groupType: AudienceGroupType;
  quantidadeQuestoes: number;
  titulo: string;
  yearSegment: YearSegment;
};

type SaveCorrectionInput = {
  answers: ReviewAnswerInput[];
  confidence: number;
  examId: string;
  imageLabel: string;
  method: "qr" | "ocr" | "manual";
  notes: string[];
  studentId: string;
};

type SaveCorrectionRuleInput = {
  arredondamentoCasas: number;
  modoQuestaoAnulada: "full-credit" | "ignore";
  notaMaxima: number;
  pesoPadrao: number;
  pesosPorQuestaoRaw: string;
  provaId: string;
  questoesAnuladasRaw: string;
  totalQuestions: number;
};

type AppDataContextValue = {
  analytics: ReturnType<typeof calculateAnalytics>;
  authResolved: boolean;
  data: AppDataState;
  isHydrated: boolean;
  session: AuthSessionUser | null;
  createClass: (input: CreateClassInput) => void;
  createExam: (input: CreateExamInput) => void;
  createStudent: (input: CreateStudentInput) => void;
  deleteClass: (classId: string) => { ok: boolean; message: string };
  deleteExam: (examId: string) => { ok: boolean; message: string };
  deleteStudent: (studentId: string) => { ok: boolean; message: string };
  exportData: () => string;
  getOperationalCsv: () => string;
  importData: (payload: string) => { ok: boolean; message: string };
  loginTeacher: (input: {
    email: string;
    password: string;
    remember: boolean;
  }) => Promise<{ ok: boolean; message: string; redirectTo?: string }>;
  logoutTeacher: () => Promise<void>;
  changeTeacherPassword: (input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<{ ok: boolean; message: string; redirectTo?: string }>;
  resetData: () => void;
  saveAnswerKey: (examId: string, answers: string[]) => void;
  saveCorrection: (input: SaveCorrectionInput) => { ok: boolean; message: string };
  saveCorrectionRule: (input: SaveCorrectionRuleInput) => { ok: boolean; message: string };
  updateClass: (classId: string, input: CreateClassInput) => { ok: boolean; message: string };
  updateExam: (examId: string, input: CreateExamInput) => { ok: boolean; message: string };
  updateStudent: (studentId: string, input: CreateStudentInput) => { ok: boolean; message: string };
};

const AppDataContext = createContext<AppDataContextValue | null>(null);
const subscribe = () => () => {};

function normalizeImportedData(value: unknown): AppDataState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<AppDataState>;
  if (
    !Array.isArray(candidate.answerKeys) ||
    !Array.isArray(candidate.classes) ||
    !Array.isArray(candidate.corrections) ||
    !Array.isArray(candidate.exams) ||
    !Array.isArray(candidate.students)
  ) {
    return null;
  }

  const teacherProfile =
    candidate.teacherProfile && typeof candidate.teacherProfile === "object"
      ? {
          ...cloneDefaultAppData().teacherProfile,
          ...candidate.teacherProfile,
          escola:
            candidate.teacherProfile.escola === "Instituto Monte Azul"
              ? "E.E Professor Fabio Fanucchi"
              : (candidate.teacherProfile.escola ?? cloneDefaultAppData().teacherProfile.escola),
        }
      : cloneDefaultAppData().teacherProfile;

  const nextState = {
    answerKeys: candidate.answerKeys as AnswerKey[],
    classes: candidate.classes as ClassRoom[],
    correctionRules: Array.isArray(candidate.correctionRules)
      ? (candidate.correctionRules as ExamCorrectionRule[])
      : cloneDefaultAppData().correctionRules,
    corrections: candidate.corrections as CorrectionSession[],
    exams: candidate.exams as Exam[],
    students: candidate.students as Student[],
    teacherProfile,
  };

  return normalizeAppDataState(nextState);
}

function normalizeSession(value: unknown): AuthSessionUser | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<AuthSessionUser>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.nome !== "string" ||
    typeof candidate.email !== "string" ||
    typeof candidate.role !== "string" ||
    typeof candidate.forcePasswordChange !== "boolean" ||
    typeof candidate.loggedInAt !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    nome: candidate.nome,
    email: candidate.email,
    forcePasswordChange: candidate.forcePasswordChange,
    loggedInAt: candidate.loggedInAt,
    remember: Boolean(candidate.remember),
    role: candidate.role,
  };
}

function buildOperationalCsv(data: AppDataState) {
  const rows = [
    ["secao", "valor"],
    ["turmas", String(data.classes.length)],
    ["alunos", String(data.students.length)],
    ["provas", String(data.exams.length)],
    ["gabaritos", String(data.answerKeys.length)],
    ["regras_correcao", String(data.correctionRules.length)],
    ["correcoes", String(data.corrections.length)],
    ["alunos_ativos", String(data.students.filter((item) => item.status === "Ativo").length)],
  ];

  return rows.map((row) => row.join(",")).join("\n");
}

function normalizeAppDataState(state: AppDataState): AppDataState {
  const normalizedClasses = normalizeClasses(state.classes);
  const normalizedExams = normalizeExams(state.exams, normalizedClasses);
  return {
    ...state,
    classes: normalizedClasses,
    corrections: state.corrections.map((item) => ({
      ...item,
      prova: normalizeExams([item.prova], normalizedClasses)[0],
    })),
    exams: normalizedExams,
  };
}

function applyRemoteAppData(remote: AppDataState, session: AuthSessionUser | null) {
  const normalized = normalizeAppDataState(remote);

  return {
    ...normalized,
    teacherProfile: {
      ...normalized.teacherProfile,
      email: session?.email ?? normalized.teacherProfile.email,
      nome: session?.nome ?? normalized.teacherProfile.nome,
    },
  } satisfies AppDataState;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const isHydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [data, setData] = useState<AppDataState>(() => cloneDefaultAppData());

  const [authResolved, setAuthResolved] = useState(false);
  const [session, setSession] = useState<AuthSessionUser | null>(null);
  const hasLoadedRemoteDataRef = useRef(false);
  const lastSyncedPayloadRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let cancelled = false;

    const syncSession = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) {
            setSession(null);
            setAuthResolved(true);
          }
          return;
        }

        const payload = (await response.json()) as { user?: AuthSessionUser | null };
        if (!cancelled) {
          setSession(normalizeSession(payload.user));
          setAuthResolved(true);
        }
      } catch {
        if (!cancelled) {
          setSession(null);
          setAuthResolved(true);
        }
      }
    };

    void syncSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !session) {
      hasLoadedRemoteDataRef.current = false;
      lastSyncedPayloadRef.current = "";
      return;
    }

    let cancelled = false;

    const syncAppData = async () => {
      try {
        const response = await fetch("/api/app-data", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = normalizeImportedData(await response.json());
        if (!payload) {
          return;
        }

        if (!cancelled) {
          const nextData = applyRemoteAppData(payload, session);
          setData(nextData);
          lastSyncedPayloadRef.current = JSON.stringify(nextData);
          hasLoadedRemoteDataRef.current = true;
        }
      } catch {
        // Evita sobrescrever a planilha com estado vazio quando a carga remota falha.
      }
    };

    void syncAppData();

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (typeof window === "undefined" || !session || !hasLoadedRemoteDataRef.current) {
      return;
    }

    const payload = JSON.stringify(data);
    if (payload === lastSyncedPayloadRef.current) {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch("/api/app-data", {
            body: JSON.stringify({ data }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "PUT",
          });

          if (!response.ok || cancelled) {
            return;
          }

          lastSyncedPayloadRef.current = payload;
        } catch {
          // Mantem o estado local; a proxima alteracao tenta persistir novamente.
        }
      })();
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [data, session]);

  const value = useMemo<AppDataContextValue>(() => {
    const createClassHandler = (input: CreateClassInput) => {
      setData((previous) => normalizeAppDataState({
        ...previous,
        classes: [{ id: createId("T"), ...input }, ...previous.classes],
      }));
    };

    const updateClassHandler = (classId: string, input: CreateClassInput) => {
      setData((previous) => normalizeAppDataState({
        ...previous,
        classes: previous.classes.map((item) => (item.id === classId ? { ...item, ...input } : item)),
      }));
      return { ok: true, message: "Turma atualizada com sucesso." };
    };

    const deleteClassHandler = (classId: string) => {
      setData((previous) => {
        const linkedStudents = previous.students.filter((item) => item.turma === classId).map((item) => item.id);

        return normalizeAppDataState({
          ...previous,
          classes: previous.classes.filter((item) => item.id !== classId),
          students: previous.students.filter((item) => item.turma !== classId),
          corrections: previous.corrections.filter(
            (item) => !linkedStudents.includes(item.correction.alunoId),
          ),
        });
      });

      return { ok: true, message: "Turma removida. Provas compartilhadas foram preservadas." };
    };

    const createStudentHandler = (input: CreateStudentInput) => {
      setData((previous) => ({
        ...previous,
        students: [{ id: createId("A"), ...input }, ...previous.students],
      }));
    };

    const updateStudentHandler = (studentId: string, input: CreateStudentInput) => {
      setData((previous) => ({
        ...previous,
        corrections: previous.corrections.map((item) =>
          item.correction.alunoId === studentId
            ? {
                ...item,
                aluno: { ...item.aluno, ...input, id: studentId },
                correction: { ...item.correction, nomeDetectado: input.nome },
              }
            : item,
        ),
        students: previous.students.map((item) => (item.id === studentId ? { ...item, ...input } : item)),
      }));
      return { ok: true, message: "Aluno atualizado com sucesso." };
    };

    const deleteStudentHandler = (studentId: string) => {
      setData((previous) => ({
        ...previous,
        corrections: previous.corrections.filter((item) => item.correction.alunoId !== studentId),
        students: previous.students.filter((item) => item.id !== studentId),
      }));

      return { ok: true, message: "Aluno removido com sucesso." };
    };

    const createExamHandler = (input: CreateExamInput) => {
      const examId = createId("P");
      const codeBase = input.titulo
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 12);

      setData((previous) => {
        const nextExam: Exam = {
          id: examId,
          ...input,
          codigo: `${codeBase || "PROVA"}-${input.data.slice(0, 4)}`,
          templateVersion: "PS-CARD-1",
        };

        return {
          ...previous,
          answerKeys: [
            ...previous.answerKeys,
            ...Array.from({ length: input.quantidadeQuestoes }, (_, index) => ({
              provaId: examId,
              questao: index + 1,
              respostaCorreta: input.alternativas[0] ?? "A",
            })),
          ],
          correctionRules: [buildDefaultCorrectionRule(nextExam), ...previous.correctionRules],
          exams: [nextExam, ...previous.exams],
        };
      });
    };

    const updateExamHandler = (examId: string, input: CreateExamInput) => {
      setData((previous) => {
        const currentExam = previous.exams.find((item) => item.id === examId);
        const previousAnswerKey = previous.answerKeys
          .filter((item) => item.provaId === examId)
          .sort((a, b) => a.questao - b.questao);
        const nextAnswerKeys = Array.from({ length: input.quantidadeQuestoes }, (_, index) => ({
          provaId: examId,
          questao: index + 1,
          respostaCorreta: previousAnswerKey[index]?.respostaCorreta ?? input.alternativas[0] ?? "A",
        }));

        return {
          ...previous,
          answerKeys: [...previous.answerKeys.filter((item) => item.provaId !== examId), ...nextAnswerKeys],
          correctionRules: previous.correctionRules.map((item) =>
            item.provaId === examId
              ? {
                  ...item,
                  pesosPorQuestao: item.pesosPorQuestao.filter((peso) => peso.questao <= input.quantidadeQuestoes),
                  questoesAnuladas: item.questoesAnuladas.filter((questao) => questao <= input.quantidadeQuestoes),
                }
              : item,
          ),
          corrections: previous.corrections.filter((item) => item.correction.provaId !== examId),
          exams: previous.exams.map((item) =>
            item.id === examId
              ? {
                  ...item,
                  ...input,
                  codigo: currentExam?.codigo ?? item.codigo,
                  templateVersion: "PS-CARD-1",
                }
              : item,
          ),
        };
      });

      return {
        ok: true,
        message: "Prova atualizada. Correções antigas dessa prova foram removidas para manter consistência.",
      };
    };

    const deleteExamHandler = (examId: string) => {
      setData((previous) => ({
        ...previous,
        answerKeys: previous.answerKeys.filter((item) => item.provaId !== examId),
        correctionRules: previous.correctionRules.filter((item) => item.provaId !== examId),
        corrections: previous.corrections.filter((item) => item.correction.provaId !== examId),
        exams: previous.exams.filter((item) => item.id !== examId),
      }));

      return { ok: true, message: "Prova, gabarito, regras e correções vinculadas foram removidos." };
    };

    const saveAnswerKeyHandler = (examId: string, answers: string[]) => {
      setData((previous) => {
        const filtered = previous.answerKeys.filter((item) => item.provaId !== examId);
        return {
          ...previous,
          answerKeys: [
            ...filtered,
            ...answers.map((respostaCorreta, index) => ({
              provaId: examId,
              questao: index + 1,
              respostaCorreta,
            })),
          ],
        };
      });
    };

    const saveCorrectionRuleHandler = (input: SaveCorrectionRuleInput) => {
      const nextRule: ExamCorrectionRule = {
        arredondamentoCasas: input.arredondamentoCasas,
        modoQuestaoAnulada: input.modoQuestaoAnulada,
        notaMaxima: input.notaMaxima,
        pesoPadrao: input.pesoPadrao,
        pesosPorQuestao: sanitizeWeights(input.pesosPorQuestaoRaw, input.totalQuestions),
        provaId: input.provaId,
        questoesAnuladas: sanitizeQuestionList(input.questoesAnuladasRaw, input.totalQuestions),
      };

      setData((previous) => ({
        ...previous,
        correctionRules: [
          ...previous.correctionRules.filter((item) => item.provaId !== input.provaId),
          nextRule,
        ],
      }));

      return { ok: true, message: "Regras de correção salvas com sucesso." };
    };

    const saveCorrectionHandler = (input: SaveCorrectionInput) => {
      const student = data.students.find((item) => item.id === input.studentId);
      const answerKey = data.answerKeys
        .filter((item) => item.provaId === input.examId)
        .sort((a, b) => a.questao - b.questao);

      if (!student) {
        return { ok: false, message: "Selecione um aluno válido." };
      }

      if (!answerKey.length) {
        return { ok: false, message: "Esta prova ainda não possui gabarito salvo." };
      }

      const sessionToSave = buildCorrectionSession({
        answerKey,
        answers: input.answers,
        classes: data.classes,
        confidence: input.confidence,
        exams: data.exams,
        imageLabel: input.imageLabel,
        method: input.method,
        notes: input.notes,
        rules: data.correctionRules,
        student,
      });

      setData((previous) => ({
        ...previous,
        corrections: [sessionToSave, ...previous.corrections],
      }));

      return { ok: true, message: "Correção salva com sucesso na planilha operacional." };
    };

    const exportDataHandler = () => JSON.stringify(data, null, 2);
    const getOperationalCsvHandler = () => buildOperationalCsv(data);

    const importDataHandler = (payload: string) => {
      try {
        const parsed = normalizeImportedData(JSON.parse(payload));
        if (!parsed) {
          return { ok: false, message: "Arquivo JSON inválido para importação." };
        }

        setData(normalizeAppDataState(parsed));
        return { ok: true, message: "Dados importados com sucesso." };
      } catch {
        return { ok: false, message: "Não foi possível ler o JSON informado." };
      }
    };

    const resetDataHandler = () => {
      setData(cloneDefaultAppData());
    };

    const loginTeacherHandler = async (input: { email: string; password: string; remember: boolean }) => {
      if (!input.email.trim()) {
        return { ok: false, message: "Informe o nome de acesso para entrar no painel." };
      }

      if (!input.password.trim()) {
        return { ok: false, message: "Informe uma senha para continuar." };
      }

      try {
        const response = await fetch("/api/auth/login", {
          body: JSON.stringify({
            email: input.email.trim(),
            password: input.password,
            remember: input.remember,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        const payload = (await response.json()) as {
          error?: string;
          message?: string;
          redirectTo?: string;
          user?: AuthSessionUser | null;
        };

        if (!response.ok || !payload.user) {
          return { ok: false, message: payload.error ?? "Não foi possível iniciar a sessão segura." };
        }

        setSession(normalizeSession(payload.user));
        setAuthResolved(true);
        return {
          ok: true,
          message: payload.message ?? "Login realizado com sucesso.",
          redirectTo: payload.redirectTo,
        };
      } catch {
        return { ok: false, message: "Falha ao iniciar a sessão segura." };
      }
    };

    const changeTeacherPasswordHandler = async (input: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) => {
      try {
        const response = await fetch("/api/auth/password", {
          body: JSON.stringify(input),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        const payload = (await response.json()) as {
          error?: string;
          message?: string;
          redirectTo?: string;
          user?: AuthSessionUser | null;
        };

        if (!response.ok || !payload.user) {
          return { ok: false, message: payload.error ?? "Não foi possível alterar a senha." };
        }

        setSession(normalizeSession(payload.user));
        setAuthResolved(true);
        return {
          ok: true,
          message: payload.message ?? "Senha alterada com sucesso.",
          redirectTo: payload.redirectTo,
        };
      } catch {
        return { ok: false, message: "Falha ao alterar a senha." };
      }
    };

    const logoutTeacherHandler = async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } finally {
        setSession(null);
        setAuthResolved(true);
      }
    };

    return {
      analytics: calculateAnalytics(data),
      authResolved,
      createClass: createClassHandler,
      changeTeacherPassword: changeTeacherPasswordHandler,
      createExam: createExamHandler,
      createStudent: createStudentHandler,
      data,
      deleteClass: deleteClassHandler,
      deleteExam: deleteExamHandler,
      deleteStudent: deleteStudentHandler,
      exportData: exportDataHandler,
      getOperationalCsv: getOperationalCsvHandler,
      importData: importDataHandler,
      isHydrated,
      loginTeacher: loginTeacherHandler,
      logoutTeacher: logoutTeacherHandler,
      resetData: resetDataHandler,
      saveAnswerKey: saveAnswerKeyHandler,
      saveCorrection: saveCorrectionHandler,
      saveCorrectionRule: saveCorrectionRuleHandler,
      session,
      updateClass: updateClassHandler,
      updateExam: updateExamHandler,
      updateStudent: updateStudentHandler,
    };
  }, [authResolved, data, isHydrated, session]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }

  return context;
}
