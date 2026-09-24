import type { ExamPrintOptions } from "@/lib/exam-print-options";

export type ExamLifecycleStatus = "rascunho" | "publicada" | "aplicada" | "arquivada";

export type ExamSourceType = "manual" | "pdf" | "doc" | "docx" | "imagem";

export type ExamImportStatus = "nao_aplicavel" | "processando" | "pronto" | "erro";

export type ExamQuestionType =
  | "multipla_escolha"
  | "verdadeiro_falso"
  | "resposta_curta"
  | "discursiva"
  | "associacao";

export type TeacherExamQuestion = {
  id: string;
  position: number;
  type: ExamQuestionType;
  prompt: string;
  alternatives: string[];
  correctAnswers: string[];
  weight: number;
  annulled: boolean;
  correctionCriteria: string;
  correctionNotes: string;
  needsReview: boolean;
  imagePath: string | null;
  /** Texto livre para leitura pedagógica; não cria disciplina nem catálogo. */
  topic: string;
};

export type TeacherExam = {
  id: string;
  title: string;
  description: string;
  subject: string;
  subjectId?: string | null;
  assignmentGroups?: Array<{ teacherId: string; classIds: string[] }>;
  audienceId: string;
  audienceLabel: string;
  groupType: string;
  yearSegment: string;
  period: string;
  printOptions?: ExamPrintOptions;
  examDate: string;
  instructions: string;
  estimatedDuration: number | null;
  creatorId: string;
  creatorName: string;
  sourceType: ExamSourceType;
  status: ExamLifecycleStatus;
  originalFileName: string | null;
  originalFileMimeType: string | null;
  originalFileSize: number | null;
  importedAt: string | null;
  importProcessingStatus: ExamImportStatus;
  importProcessingError: string | null;
  needsReview: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  appliedAt: string | null;
  hasResults: boolean;
  questions: TeacherExamQuestion[];
  legacyContributors: Array<{ teacherId: string; teacherName: string; subject: string }>;
};

export type TeacherExamInput = {
  title: string;
  description: string;
  subject: string;
  subjectId?: string | null;
  assignmentGroups?: Array<{ teacherId: string; classIds: string[] }>;
  audienceId: string;
  audienceLabel: string;
  groupType: string;
  yearSegment: string;
  period: string;
  printOptions?: ExamPrintOptions;
  examDate: string;
  instructions: string;
  estimatedDuration: number | null;
  questions: Array<Omit<TeacherExamQuestion, "id" | "imagePath"> & { id?: string; imagePath?: string | null }>;
};

/** Um retrato de conteúdo. A aplicação atual permanece fora da restauração. */
export type TeacherExamContentVersion = {
  id: string;
  version: number;
  createdAt: string;
  createdBy: string;
  reason: "criada" | "salva" | "publicada" | "restaurada";
};
