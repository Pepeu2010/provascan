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
  AudienceGroupType,
  ClassRoom,
  CorrectionSession,
  Exam,
  ExamCorrectionRule,
  Student,
  StudentStatus,
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

type MutationResult = {
  ok: boolean;
  message: string;
};

type SyncStatus = "idle" | "saving" | "error";

type AppDataContextValue = {
  analytics: ReturnType<typeof calculateAnalytics>;
  authResolved: boolean;
  data: AppDataState;
  isHydrated: boolean;
  session: AuthSessionUser | null;
  syncError: string;
  syncStatus: SyncStatus;
  createClass: (input: CreateClassInput) => Promise<MutationResult>;
  createExam: (input: CreateExamInput) => Promise<MutationResult>;
  createStudent: (input: CreateStudentInput) => Promise<MutationResult>;
  deleteClass: (classId: string) => Promise<MutationResult>;
  deleteExam: (examId: string) => Promise<MutationResult>;
  deleteStudent: (studentId: string) => Promise<MutationResult>;
  exportData: () => string;
  getOperationalCsv: () => string;
  importData: (payload: string) => Promise<MutationResult>;
  loginTeacher: (input: {
    email: string;
    password: string;
    remember: boolean;
  }) => Promise<{ ok: boolean; message: string; redirectTo?: string; step?: string }>;
  logoutTeacher: () => Promise<void>;
  changeTeacherPassword: (input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<{ ok: boolean; message: string; redirectTo?: string }>;
  resetData: () => Promise<MutationResult>;
  saveAnswerKey: (examId: string, answers: string[]) => Promise<MutationResult>;
  saveCorrection: (input: SaveCorrectionInput) => Promise<MutationResult>;
  saveCorrectionRule: (input: SaveCorrectionRuleInput) => Promise<MutationResult>;
  updateClass: (classId: string, input: CreateClassInput) => Promise<MutationResult>;
  updateExam: (examId: string, input: CreateExamInput) => Promise<MutationResult>;
  updateStudent: (studentId: string, input: CreateStudentInput) => Promise<MutationResult>;
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
    !(typeof candidate.subject === "string" || candidate.subject === null || candidate.subject === undefined) ||
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
    subject: candidate.subject ?? null,
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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState("");
  const hasLoadedRemoteDataRef = useRef(false);
  const lastSyncedPayloadRef = useRef("");
  const revisionRef = useRef("0");

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
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? "Falha na carga remota.");
        }

        const responsePayload = (await response.json()) as { data?: unknown; revision?: string };
        const payload = normalizeImportedData(responsePayload.data);
        if (!payload) {
          throw new Error("Payload remoto invalido.");
        }

        if (!cancelled) {
          const nextData = applyRemoteAppData(payload, session);
          revisionRef.current = responsePayload.revision ?? "0";
          setData(nextData);
          lastSyncedPayloadRef.current = JSON.stringify(nextData);
          hasLoadedRemoteDataRef.current = true;
          setSyncStatus("idle");
          setSyncError("");
        }
      } catch (error) {
        if (!cancelled) {
          hasLoadedRemoteDataRef.current = false;
          setSyncStatus("error");
          setSyncError(
            error instanceof Error && error.message
              ? error.message
              : "Não foi possível carregar os dados operacionais da planilha.",
          );
        }
      }
    };

    void syncAppData();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const value = useMemo<AppDataContextValue>(() => {
    const persistAppData = async (nextData: AppDataState, successMessage: string): Promise<MutationResult> => {
      if (!session || !hasLoadedRemoteDataRef.current) {
        return { ok: false, message: "A sessão ainda não terminou de carregar os dados remotos." };
      }

      setSyncStatus("saving");
      setSyncError("");

      try {
        const normalized = normalizeAppDataState(nextData);
        const response = await fetch("/api/app-data", {
          body: JSON.stringify({ data: normalized, revision: revisionRef.current }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PUT",
        });

        const payload = (await response.json().catch(() => ({}))) as { error?: string; revision?: string; code?: string };
        if (!response.ok) {
          if (response.status === 409) {
            hasLoadedRemoteDataRef.current = false;
            void fetch("/api/app-data", { cache: "no-store" }).then((reload) => reload.json()).then((remote: { data?: unknown; revision?: string }) => {
              const refreshed = normalizeImportedData(remote.data);
              if (refreshed) { revisionRef.current = remote.revision ?? "0"; setData(applyRemoteAppData(refreshed, session)); hasLoadedRemoteDataRef.current = true; }
            });
          }
          const message = payload.error ?? "Não foi possível sincronizar a planilha.";
          setSyncStatus("error");
          setSyncError(message);
          return { ok: false, message };
        }

        setData(normalized);
        revisionRef.current = payload.revision ?? revisionRef.current;
        lastSyncedPayloadRef.current = JSON.stringify(normalized);
        setSyncStatus("idle");
        setSyncError("");
        return { ok: true, message: successMessage };
      } catch {
        const message = "Falha de rede ao sincronizar a planilha.";
        setSyncStatus("error");
        setSyncError(message);
        return { ok: false, message };
      }
    };

    const createClassHandler = async (input: CreateClassInput) =>
      persistAppData(
        {
          ...data,
          classes: [{ id: createId("T"), ...input }, ...data.classes],
        },
        "Turma criada com sucesso.",
      );

    const updateClassHandler = async (classId: string, input: CreateClassInput) =>
      persistAppData(
        {
          ...data,
          classes: data.classes.map((item) => (item.id === classId ? { ...item, ...input } : item)),
        },
        "Turma atualizada com sucesso.",
      );

    const deleteClassHandler = async (classId: string) => {
      const linkedStudents = data.students.filter((item) => item.turma === classId).map((item) => item.id);

      return persistAppData(
        {
          ...data,
          classes: data.classes.filter((item) => item.id !== classId),
          students: data.students.filter((item) => item.turma !== classId),
          corrections: data.corrections.filter((item) => !linkedStudents.includes(item.correction.alunoId)),
        },
        "Turma removida. Provas compartilhadas foram preservadas.",
      );
    };

    const createStudentHandler = async (input: CreateStudentInput) =>
      persistAppData(
        {
          ...data,
          students: [{ id: createId("A"), ...input }, ...data.students],
        },
        "Aluno cadastrado com sucesso.",
      );

    const updateStudentHandler = async (studentId: string, input: CreateStudentInput) =>
      persistAppData(
        {
          ...data,
          corrections: data.corrections.map((item) =>
            item.correction.alunoId === studentId
              ? {
                  ...item,
                  aluno: { ...item.aluno, ...input, id: studentId },
                  correction: { ...item.correction, nomeDetectado: input.nome },
                }
              : item,
          ),
          students: data.students.map((item) => (item.id === studentId ? { ...item, ...input } : item)),
        },
        "Aluno atualizado com sucesso.",
      );

    const deleteStudentHandler = async (studentId: string) =>
      persistAppData(
        {
          ...data,
          corrections: data.corrections.filter((item) => item.correction.alunoId !== studentId),
          students: data.students.filter((item) => item.id !== studentId),
        },
        "Aluno removido com sucesso.",
      );

    const createExamHandler = async (input: CreateExamInput) => {
      const examId = createId("P");
      const codeBase = input.titulo
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 12);

      const nextExam: Exam = {
        id: examId,
        ...input,
        codigo: `${codeBase || "PROVA"}-${input.data.slice(0, 4)}`,
        subject: session?.subject ?? "",
        templateVersion: "PS-CARD-1",
      };

      return persistAppData(
        {
          ...data,
          answerKeys: [
            ...data.answerKeys,
            ...Array.from({ length: input.quantidadeQuestoes }, (_, index) => ({
              provaId: examId,
              questao: index + 1,
              respostaCorreta: input.alternativas[0] ?? "A",
            })),
          ],
          correctionRules: [buildDefaultCorrectionRule(nextExam), ...data.correctionRules],
          exams: [nextExam, ...data.exams],
        },
        "Prova criada com sucesso.",
      );
    };

    const updateExamHandler = async (examId: string, input: CreateExamInput) => {
      const currentExam = data.exams.find((item) => item.id === examId);
      const previousAnswerKey = data.answerKeys
        .filter((item) => item.provaId === examId)
        .sort((a, b) => a.questao - b.questao);

      const nextAnswerKeys = Array.from({ length: input.quantidadeQuestoes }, (_, index) => ({
        provaId: examId,
        questao: index + 1,
        respostaCorreta: previousAnswerKey[index]?.respostaCorreta ?? input.alternativas[0] ?? "A",
      }));

      return persistAppData(
        {
          ...data,
          answerKeys: [...data.answerKeys.filter((item) => item.provaId !== examId), ...nextAnswerKeys],
          correctionRules: data.correctionRules.map((item) =>
            item.provaId === examId
              ? {
                  ...item,
                  pesosPorQuestao: item.pesosPorQuestao.filter((peso) => peso.questao <= input.quantidadeQuestoes),
                  questoesAnuladas: item.questoesAnuladas.filter((questao) => questao <= input.quantidadeQuestoes),
                }
              : item,
          ),
          corrections: data.corrections.filter((item) => item.correction.provaId !== examId),
          exams: data.exams.map((item) =>
            item.id === examId
              ? {
                ...item,
                ...input,
                codigo: currentExam?.codigo ?? item.codigo,
                subject: currentExam?.subject ?? session?.subject ?? item.subject,
                templateVersion: "PS-CARD-1",
              }
              : item,
          ),
        },
        "Prova atualizada. Correcoes antigas dessa prova foram removidas para manter consistencia.",
      );
    };

    const deleteExamHandler = async (examId: string) =>
      persistAppData(
        {
          ...data,
          answerKeys: data.answerKeys.filter((item) => item.provaId !== examId),
          correctionRules: data.correctionRules.filter((item) => item.provaId !== examId),
          corrections: data.corrections.filter((item) => item.correction.provaId !== examId),
          exams: data.exams.filter((item) => item.id !== examId),
        },
        "Prova, gabarito, regras e correções vinculadas foram removidos.",
      );

    const saveAnswerKeyHandler = async (examId: string, answers: string[]) =>
      persistAppData(
        {
          ...data,
          answerKeys: [
            ...data.answerKeys.filter((item) => item.provaId !== examId),
            ...answers.map((respostaCorreta, index) => ({
              provaId: examId,
              questao: index + 1,
              respostaCorreta,
            })),
          ],
        },
        "Gabarito salvo com sucesso.",
      );

    const saveCorrectionRuleHandler = async (input: SaveCorrectionRuleInput) => {
      const nextRule: ExamCorrectionRule = {
        arredondamentoCasas: input.arredondamentoCasas,
        modoQuestaoAnulada: input.modoQuestaoAnulada,
        notaMaxima: input.notaMaxima,
        pesoPadrao: input.pesoPadrao,
        pesosPorQuestao: sanitizeWeights(input.pesosPorQuestaoRaw, input.totalQuestions),
        provaId: input.provaId,
        questoesAnuladas: sanitizeQuestionList(input.questoesAnuladasRaw, input.totalQuestions),
      };

      return persistAppData(
        {
          ...data,
          correctionRules: [
            ...data.correctionRules.filter((item) => item.provaId !== input.provaId),
            nextRule,
          ],
        },
        "Regras de correção salvas com sucesso.",
      );
    };

    const saveCorrectionHandler = async (input: SaveCorrectionInput) => {
      const student = data.students.find((item) => item.id === input.studentId);
      const answerKey = data.answerKeys
        .filter((item) => item.provaId === input.examId)
        .sort((a, b) => a.questao - b.questao);

      if (!student) {
        return { ok: false, message: "Selecione um aluno valido." };
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

      return persistAppData(
        {
          ...data,
          corrections: [sessionToSave, ...data.corrections],
        },
        "Correção salva com sucesso na planilha operacional.",
      );
    };

    const exportDataHandler = () => JSON.stringify(data, null, 2);
    const getOperationalCsvHandler = () => buildOperationalCsv(data);

    const importDataHandler = async (payload: string) => {
      try {
        const parsed = normalizeImportedData(JSON.parse(payload));
        if (!parsed) {
          return { ok: false, message: "Arquivo JSON invalido para importacao." };
        }

        return persistAppData(parsed, "Dados importados com sucesso.");
      } catch {
        return { ok: false, message: "Não foi possível ler o JSON informado." };
      }
    };

    const resetDataHandler = async () =>
      persistAppData(cloneDefaultAppData(), "Base operacional restaurada.");

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
          step?: string;
          user?: AuthSessionUser | null;
        };

        if (!response.ok) {
          return { ok: false, message: payload.error ?? "Não foi possível iniciar a sessão segura." };
        }

        if (payload.step) return { ok: true, message: payload.message ?? "Credenciais confirmadas.", step: payload.step };
        if (!payload.user) return { ok: false, message: "Não foi possível iniciar a sessão segura." };

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
      changeTeacherPassword: changeTeacherPasswordHandler,
      createClass: createClassHandler,
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
      syncError,
      syncStatus,
      updateClass: updateClassHandler,
      updateExam: updateExamHandler,
      updateStudent: updateStudentHandler,
    };
  }, [authResolved, data, isHydrated, session, syncError, syncStatus]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }

  return context;
}
