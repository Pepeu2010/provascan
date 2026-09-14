import type { UniversalExamStructure, UniversalDetectedAnswer } from "@/services/universal-exam-core";

export type ExternalExamTemplate = {
  answerKey: string[];
  createdAt: string;
  id: string;
  name: string;
  structure: UniversalExamStructure;
  updatedAt: string;
};

export type ExternalCorrectionRecord = {
  answers: UniversalDetectedAnswer[];
  correctedAt: string;
  id: string;
  sourceLabel: string;
  studentName: string;
  summary: {
    blank: number;
    correct: number;
    incorrect: number;
    multipleMarks: number;
    review: number;
    score: number;
  };
  templateId: string | null;
};
