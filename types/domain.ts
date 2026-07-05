export type StudentStatus = "Ativo" | "Transferido" | "Inativo";

export type YearSegment = "1" | "2" | "3" | "OUTROS";

export type AudienceGroupType =
  | "GERAL"
  | "EXATAS"
  | "HUMANAS"
  | "TECNICO"
  | "CIENCIA_DE_DADOS"
  | "ADS"
  | "MISTO"
  | "TURMA"
  | "INDEFINIDO";

export type Student = {
  id: string;
  nome: string;
  matricula: string;
  turma: string;
  status: StudentStatus;
};

export type ClassRoom = {
  id: string;
  nome: string;
  professor: string;
  ano: string;
  periodo: string;
  audienceId?: string;
  audienceLabel?: string;
  groupType?: AudienceGroupType;
  requiresManualGrouping?: boolean;
  yearSegment?: YearSegment;
};

export type Exam = {
  id: string;
  titulo: string;
  subject: string;
  audienceId: string;
  audienceLabel: string;
  groupType: AudienceGroupType;
  yearSegment: YearSegment;
  quantidadeQuestoes: number;
  alternativas: string[];
  data: string;
  codigo: string;
  templateVersion: string;
};

export type AnswerKey = {
  provaId: string;
  questao: number;
  respostaCorreta: string;
};

export type AnnulledQuestionMode = "full-credit" | "ignore";

export type QuestionWeight = {
  questao: number;
  peso: number;
};

export type ExamCorrectionRule = {
  provaId: string;
  notaMaxima: number;
  arredondamentoCasas: number;
  pesoPadrao: number;
  pesosPorQuestao: QuestionWeight[];
  questoesAnuladas: number[];
  modoQuestaoAnulada: AnnulledQuestionMode;
};

export type CorrectionMethod = "qr" | "ocr" | "manual";

export type CorrectionAnswerStatus =
  | "acerto"
  | "erro"
  | "em-branco"
  | "multipla-marcacao"
  | "anulada";

export type CorrectionAnswer = {
  questao: number;
  marcacoes: string[];
  respostaAluno: string;
  respostaCorreta: string;
  status: CorrectionAnswerStatus;
  pontuacao: number;
  peso: number;
};

export type CorrectionSummary = {
  id: string;
  provaId: string;
  alunoId: string;
  nomeDetectado: string;
  nota: number;
  acertos: number;
  erros: number;
  emBranco: number;
  multiplasMarcacoes: number;
  anuladas: number;
  percentual: number;
  data: string;
  imagem: string;
  tempoCorrecao: string;
  metodoIdentificacao: CorrectionMethod;
};

export type CorrectionSession = {
  correction: CorrectionSummary;
  aluno: Student;
  prova: Exam;
  turma: ClassRoom;
  respostas: CorrectionAnswer[];
  confiancaOcr: number;
  imagemProcessada: string;
  observacoes: string[];
  identificacao: {
    method: CorrectionMethod;
    qrCode: string;
    uniqueCode: string;
  };
};

export type DashboardMetric = {
  label: string;
  value: string;
  helper: string;
  trend: string;
};

export type TeacherProfile = {
  nome: string;
  email: string;
  escola: string;
};
