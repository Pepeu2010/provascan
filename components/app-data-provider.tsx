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
import type { AnswerKey, ClassRoom, CorrectionSession, Exam, Student, StudentStatus } from "@/types/domain";

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

type AppDataContextValue = {
  analytics: ReturnType<typeof calculateAnalytics>;
  data: AppDataState;
  createClass: (input: CreateClassInput) => void;
  createExam: (input: CreateExamInput) => void;
  createStudent: (input: CreateStudentInput) => void;
  exportData: () => string;
  importData: (payload: string) => { ok: boolean; message: string };
  resetData: () => void;
  saveAnswerKey: (examId: string, answers: string[]) => void;
  saveCorrection: (input: SaveCorrectionInput) => { ok: boolean; message: string };
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

export function AppDataProvider({ children }: { children: ReactNode }) {
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

  useEffect(() => {
    window.localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const value = useMemo<AppDataContextValue>(() => {
    const createClassHandler = (input: CreateClassInput) => {
      setData((previous) => ({
        ...previous,
        classes: [
          {
            id: createId("T"),
            ...input,
          },
          ...previous.classes,
        ],
      }));
    };

    const createStudentHandler = (input: CreateStudentInput) => {
      setData((previous) => ({
        ...previous,
        students: [
          {
            id: createId("A"),
            ...input,
          },
          ...previous.students,
        ],
      }));
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
        exams: [
          {
            id: examId,
            ...input,
          },
          ...previous.exams,
        ],
      }));
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
        return { ok: false, message: "Selecione um aluno válido." };
      }

      if (!answerKey.length) {
        return { ok: false, message: "Esta prova ainda não possui gabarito salvo." };
      }

      const session = createCorrectionSession({
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
        corrections: [session, ...previous.corrections],
      }));

      return { ok: true, message: "Correção salva com sucesso no histórico local." };
    };

    const exportDataHandler = () => JSON.stringify(data, null, 2);

    const importDataHandler = (payload: string) => {
      try {
        const parsed = normalizeImportedData(JSON.parse(payload));
        if (!parsed) {
          return { ok: false, message: "Arquivo JSON inválido para importação." };
        }

        setData(parsed);
        return { ok: true, message: "Dados importados com sucesso." };
      } catch {
        return { ok: false, message: "Não foi possível ler o JSON informado." };
      }
    };

    const resetDataHandler = () => {
      setData(cloneDefaultAppData());
    };

    return {
      analytics: calculateAnalytics(data),
      data,
      createClass: createClassHandler,
      createExam: createExamHandler,
      createStudent: createStudentHandler,
      exportData: exportDataHandler,
      importData: importDataHandler,
      resetData: resetDataHandler,
      saveAnswerKey: saveAnswerKeyHandler,
      saveCorrection: saveCorrectionHandler,
    };
  }, [data]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }

  return context;
}
