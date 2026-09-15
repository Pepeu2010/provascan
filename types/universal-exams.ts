import type { UniversalExamStructure, UniversalDetectedAnswer } from "@/services/universal-exam-core";
import type { UniversalGradingRules } from "@/services/universal-grading-rules";
import type { ReviewAuditEntry } from "@/lib/correction-review";

export type ExternalExamTemplate = {
  answerKey: string[];
  createdAt: string;
  gradingRules: UniversalGradingRules;
  id: string;
  name: string;
  structure: UniversalExamStructure;
  updatedAt: string;
};

export type ExternalCorrectionRecord = {
  answerKey: string[];
  answers: UniversalDetectedAnswer[];
  correctedAt: string;
  gradingRules: UniversalGradingRules;
  id: string;
  reviewAudit: ReviewAuditEntry[];
  sourceLabel: string;
  studentName: string;
  structure: UniversalExamStructure;
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
