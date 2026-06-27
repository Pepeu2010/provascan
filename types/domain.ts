export type StudentStatus = "Ativo" | "Transferido" | "Inativo";

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
};

export type Exam = {
  id: string;
  titulo: string;
  turma: string;
  quantidadeQuestoes: number;
  alternativas: string[];
  data: string;
};

export type AnswerKey = {
  provaId: string;
  questao: number;
  respostaCorreta: string;
};

export type CorrectionSummary = {
  id: string;
  provaId: string;
  alunoId: string;
  nomeDetectado: string;
  nota: number;
  acertos: number;
  erros: number;
  percentual: number;
  data: string;
  imagem: string;
  tempoCorrecao: string;
};

export type CorrectionAnswer = {
  questao: number;
  respostaAluno: string;
  respostaCorreta: string;
  resultado: "acerto" | "erro";
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
