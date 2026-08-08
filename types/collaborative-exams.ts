export type ExamSectionStatus = "rascunho" | "enviado" | "aprovado" | "devolvido";

export type CollaborativeExamSection = {
  id: string;
  examId: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  questionStart: number;
  questionCount: number;
  questionEnd: number;
  status: ExamSectionStatus;
  reviewNote: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  answers?: string[];
};

export type CollaborativeExam = {
  id: string;
  title: string;
  audienceLabel: string;
  alternatives: string[];
  examDate: string;
  questionCount: number;
  releasedAt: string | null;
  sections: CollaborativeExamSection[];
};
