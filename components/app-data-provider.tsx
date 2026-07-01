"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  APP_DATA_STORAGE_KEY,
  calculateAnalytics,
  cloneDefaultAppData,
  createCorrectionSession,
  createId,
  type AppDataState,
} from "@/lib/app-data";
import type {
  AnswerKey,
  ClassRoom,
  CorrectionSession,
  Exam,
  Student,
  StudentStatus,
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
  data: string;
  quantidadeQuestoes: number;
  titulo: string;
  turma: string;
};

type SaveCorrectionInput = {
  answers: string[];
  examId: string;
  imageLabel: string;
  notes: string[];
  studentId: string;
};

type TeacherSession = {
  email: string;
  loggedInAt: string;
  remember: boolean;
};

type AppDataContextValue = {
  analytics: ReturnType<typeof calculateAnalytics>;
  data: AppDataState;
  isHydrated: boolean;
  session: TeacherSession | null;
  createClass: (input: CreateClassInput) => void;
  createExam: (input: CreateExamInput) => void;
  createStudent: (input: CreateStudentInput) => void;
  deleteClass: (classId: string) => { ok: boolean; message: string };
  deleteExam: (examId: string) => { ok: boolean; message: string };
  deleteStudent: (studentId: string) => { ok: boolean; message: string };
  exportData: () => string;
  getOperationalCsv: () => string;
  importData: (payload: string) => { ok: boolean; message: string };
  loginTeacher: (input: { email: string; password: string; remember: boolean }) => Promise<{ ok: boolean; message: string }>;
  logoutTeacher: () => Promise<void>;
  resetData: () => void;
  saveAnswerKey: (examId: string, answers: string[]) => void;
  saveCorrection: (input: SaveCorrectionInput) => { ok: boolean; message: string };
  updateClass: (classId: string, input: CreateClassInput) => { ok: boolean; message: string };
  updateExam: (examId: string, input: CreateExamInput) => { ok: boolean; message: string };
  updateStudent: (studentId: string, input: CreateStudentInput) => { ok: boolean; message: string };
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

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

  return {
    answerKeys: candidate.answerKeys as AnswerKey[],
    classes: candidate.classes as ClassRoom[],
    corrections: candidate.corrections as CorrectionSession[],
    exams: candidate.exams as Exam[],
    students: candidate.students as Student[],
    teacherProfile: candidate.teacherProfile ?? cloneDefaultAppData().teacherProfile,
  };
}

function normalizeSession(value: unknown): TeacherSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<TeacherSession>;
  if (typeof candidate.email !== "string" || typeof candidate.loggedInAt !== "string") {
    return null;
  }

  return {
    email: candidate.email,
    loggedInAt: candidate.loggedInAt,
    remember: Boolean(candidate.remember),
  };
}

function buildOperationalCsv(data: AppDataState) {
  const rows = [
    ["secao", "valor"],
    ["turmas", String(data.classes.length)],
    ["alunos", String(data.students.length)],
    ["provas", String(data.exams.length)],
    ["gabaritos", String(data.answerKeys.length)],
    ["correcoes", String(data.corrections.length)],
    ["alunos_ativos", String(data.students.filter((item) => item.status === "Ativo").length)],
  ];

  return rows.map((row) => row.join(",")).join("\n");
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [isHydrated] = useState(() => typeof window !== "undefined");
  const [data, setData] = useState<AppDataState>(() => {
    if (typeof window === "undefined") {
      return cloneDefaultAppData();
    }

    try {
      const raw = window.localStorage.getItem(APP_DATA_STORAGE_KEY);
      if (!raw) {
        return cloneDefaultAppData();
      }

      const parsed = normalizeImportedData(JSON.parse(raw));
      return parsed ?? cloneDefaultAppData();
    } catch {
      return cloneDefaultAppData();
    }
  });

  const [session, setSession] = useState<TeacherSession | null>(() => {
    return null;
  });

  useEffect(() => {
    window.localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let cancelled = false;

    const syncSession = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) {
            setSession(null);
          }
          return;
        }

        const payload = (await response.json()) as { session: TeacherSession | null };
        if (!cancelled) {
          setSession(normalizeSession(payload.session));
        }
      } catch {
        if (!cancelled) {
          setSession(null);
        }
      }
    };

    void syncSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AppDataContextValue>(() => {
    const createClassHandler = (input: CreateClassInput) => {
      setData((previous) => ({
        ...previous,
        classes: [{ id: createId("T"), ...input }, ...previous.classes],
      }));
    };

    const updateClassHandler = (classId: string, input: CreateClassInput) => {
      setData((previous) => ({
        ...previous,
        classes: previous.classes.map((item) => (item.id === classId ? { ...item, ...input } : item)),
      }));
      return { ok: true, message: "Turma atualizada com sucesso." };
    };

    const deleteClassHandler = (classId: string) => {
      setData((previous) => {
        const linkedStudents = previous.students.filter((item) => item.turma === classId).map((item) => item.id);
        const linkedExams = previous.exams.filter((item) => item.turma === classId).map((item) => item.id);

        return {
          ...previous,
          classes: previous.classes.filter((item) => item.id !== classId),
          students: previous.students.filter((item) => item.turma !== classId),
          exams: previous.exams.filter((item) => item.turma !== classId),
          answerKeys: previous.answerKeys.filter((item) => !linkedExams.includes(item.provaId)),
          corrections: previous.corrections.filter(
            (item) => !linkedStudents.includes(item.correction.alunoId) && !linkedExams.includes(item.correction.provaId),
          ),
        };
      });

      return { ok: true, message: "Turma e dados vinculados removidos do modo local." };
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
      setData((previous) => ({
        ...previous,
        answerKeys: [
          ...previous.answerKeys,
          ...Array.from({ length: input.quantidadeQuestoes }, (_, index) => ({
            provaId: examId,
            questao: index + 1,
            respostaCorreta: input.alternativas[0] ?? "A",
          })),
        ],
        exams: [{ id: examId, ...input }, ...previous.exams],
      }));
    };

    const updateExamHandler = (examId: string, input: CreateExamInput) => {
      setData((previous) => {
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
          corrections: previous.corrections.filter((item) => item.correction.provaId !== examId),
          exams: previous.exams.map((item) => (item.id === examId ? { ...item, ...input } : item)),
        };
      });

      return {
        ok: true,
        message: "Prova atualizada. Correcoes antigas dessa prova foram removidas para manter consistencia.",
      };
    };

    const deleteExamHandler = (examId: string) => {
      setData((previous) => ({
        ...previous,
        answerKeys: previous.answerKeys.filter((item) => item.provaId !== examId),
        corrections: previous.corrections.filter((item) => item.correction.provaId !== examId),
        exams: previous.exams.filter((item) => item.id !== examId),
      }));

      return { ok: true, message: "Prova, gabarito e correcoes vinculadas foram removidos." };
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

    const saveCorrectionHandler = (input: SaveCorrectionInput) => {
      const student = data.students.find((item) => item.id === input.studentId);
      const answerKey = data.answerKeys
        .filter((item) => item.provaId === input.examId)
        .sort((a, b) => a.questao - b.questao);

      if (!student) {
        return { ok: false, message: "Selecione um aluno valido." };
      }

      if (!answerKey.length) {
        return { ok: false, message: "Esta prova ainda nao possui gabarito salvo." };
      }

      const sessionToSave = createCorrectionSession({
        answerKey,
        answers: input.answers,
        classes: data.classes,
        exams: data.exams,
        imageLabel: input.imageLabel,
        notes: input.notes,
        student,
      });

      setData((previous) => ({
        ...previous,
        corrections: [sessionToSave, ...previous.corrections],
      }));

      return { ok: true, message: "Correcao salva com sucesso no historico local." };
    };

    const exportDataHandler = () => JSON.stringify(data, null, 2);
    const getOperationalCsvHandler = () => buildOperationalCsv(data);

    const importDataHandler = (payload: string) => {
      try {
        const parsed = normalizeImportedData(JSON.parse(payload));
        if (!parsed) {
          return { ok: false, message: "Arquivo JSON invalido para importacao." };
        }

        setData(parsed);
        return { ok: true, message: "Dados importados com sucesso." };
      } catch {
        return { ok: false, message: "Nao foi possivel ler o JSON informado." };
      }
    };

    const resetDataHandler = () => {
      setData(cloneDefaultAppData());
    };

    const loginTeacherHandler = async (input: { email: string; password: string; remember: boolean }) => {
      if (!input.email.trim()) {
        return { ok: false, message: "Informe um e-mail para entrar no painel." };
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
          session?: TeacherSession | null;
        };

        if (!response.ok || !payload.session) {
          return { ok: false, message: payload.error ?? "Nao foi possivel iniciar a sessao segura." };
        }

        setSession(normalizeSession(payload.session));
        return { ok: true, message: payload.message ?? "Sessao segura iniciada no navegador." };
      } catch {
        return { ok: false, message: "Falha ao iniciar a sessao segura." };
      }
    };

    const logoutTeacherHandler = async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } finally {
        setSession(null);
      }
    };

    return {
      analytics: calculateAnalytics(data),
      data,
      isHydrated,
      session,
      createClass: createClassHandler,
      createExam: createExamHandler,
      createStudent: createStudentHandler,
      deleteClass: deleteClassHandler,
      deleteExam: deleteExamHandler,
      deleteStudent: deleteStudentHandler,
      exportData: exportDataHandler,
      getOperationalCsv: getOperationalCsvHandler,
      importData: importDataHandler,
      loginTeacher: loginTeacherHandler,
      logoutTeacher: logoutTeacherHandler,
      resetData: resetDataHandler,
      saveAnswerKey: saveAnswerKeyHandler,
      saveCorrection: saveCorrectionHandler,
      updateClass: updateClassHandler,
      updateExam: updateExamHandler,
      updateStudent: updateStudentHandler,
    };
  }, [data, isHydrated, session]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }

  return context;
}
