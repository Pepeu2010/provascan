import type {
  AnswerKey,
  ClassRoom,
  CorrectionSession,
  DashboardMetric,
  Exam,
  Student,
  TeacherProfile,
} from "@/types/domain";

export const teacherProfile: TeacherProfile = {
  nome: "Prof. Helena Duarte",
  email: "helena@escolaexemplo.com",
  escola: "Instituto Monte Azul",
};

export const classes: ClassRoom[] = [
  { id: "T-101", nome: "3A Ensino Médio", professor: teacherProfile.nome, ano: "2026", periodo: "Manhã" },
  { id: "T-102", nome: "2B Ensino Médio", professor: teacherProfile.nome, ano: "2026", periodo: "Tarde" },
  { id: "T-103", nome: "9º Ano A", professor: teacherProfile.nome, ano: "2026", periodo: "Manhã" },
];

export const students: Student[] = [
  { id: "A-001", nome: "Ana Beatriz Rocha", matricula: "2026001", turma: "T-101", status: "Ativo" },
  { id: "A-002", nome: "Caio Mendes", matricula: "2026002", turma: "T-101", status: "Ativo" },
  { id: "A-003", nome: "Lucas Prado", matricula: "2026003", turma: "T-102", status: "Ativo" },
  { id: "A-004", nome: "Marina Salles", matricula: "2026004", turma: "T-103", status: "Ativo" },
  { id: "A-005", nome: "Rafael Costa", matricula: "2026005", turma: "T-103", status: "Transferido" },
];

export const exams: Exam[] = [
  { id: "P-301", titulo: "Simulado ENEM I", turma: "T-101", quantidadeQuestoes: 20, alternativas: ["A", "B", "C", "D", "E"], data: "2026-06-18" },
  { id: "P-302", titulo: "Revisão de Química", turma: "T-102", quantidadeQuestoes: 15, alternativas: ["A", "B", "C", "D", "E"], data: "2026-06-12" },
  { id: "P-303", titulo: "Avaliação de Ciências", turma: "T-103", quantidadeQuestoes: 10, alternativas: ["A", "B", "C", "D"], data: "2026-06-06" },
];

export const answerKeys: AnswerKey[] = [
  { provaId: "P-301", questao: 1, respostaCorreta: "B" },
  { provaId: "P-301", questao: 2, respostaCorreta: "D" },
  { provaId: "P-301", questao: 3, respostaCorreta: "A" },
  { provaId: "P-301", questao: 4, respostaCorreta: "C" },
  { provaId: "P-301", questao: 5, respostaCorreta: "E" },
  { provaId: "P-301", questao: 6, respostaCorreta: "A" },
  { provaId: "P-301", questao: 7, respostaCorreta: "C" },
  { provaId: "P-301", questao: 8, respostaCorreta: "B" },
];

export const correctionSessions: CorrectionSession[] = [
  {
    correction: {
      id: "C-900",
      provaId: "P-301",
      alunoId: "A-001",
      nomeDetectado: "Ana Beatriz Rocha",
      nota: 8.5,
      acertos: 17,
      erros: 3,
      percentual: 85,
      data: "2026-06-26T13:40:00.000Z",
      imagem: "camera-ana-beatriz.jpg",
      tempoCorrecao: "12s",
    },
    aluno: students[0],
    prova: exams[0],
    turma: classes[0],
    confiancaOcr: 94,
    imagemProcessada: "foto corrigida com contraste ajustado e grade identificada",
    observacoes: [
      "Nome detectado com alta confiança.",
      "Questão 5 ficou ambígua e exigiu revisão manual.",
    ],
    respostas: [
      { questao: 1, respostaAluno: "B", respostaCorreta: "B", resultado: "acerto" },
      { questao: 2, respostaAluno: "D", respostaCorreta: "D", resultado: "acerto" },
      { questao: 3, respostaAluno: "A", respostaCorreta: "A", resultado: "acerto" },
      { questao: 4, respostaAluno: "E", respostaCorreta: "C", resultado: "erro" },
      { questao: 5, respostaAluno: "C", respostaCorreta: "E", resultado: "erro" },
      { questao: 6, respostaAluno: "A", respostaCorreta: "A", resultado: "acerto" },
      { questao: 7, respostaAluno: "C", respostaCorreta: "C", resultado: "acerto" },
      { questao: 8, respostaAluno: "B", respostaCorreta: "B", resultado: "acerto" },
    ],
  },
  {
    correction: {
      id: "C-901",
      provaId: "P-302",
      alunoId: "A-003",
      nomeDetectado: "Lucas Prado",
      nota: 7.2,
      acertos: 11,
      erros: 4,
      percentual: 73,
      data: "2026-06-25T16:10:00.000Z",
      imagem: "upload-lucas.png",
      tempoCorrecao: "18s",
    },
    aluno: students[2],
    prova: exams[1],
    turma: classes[1],
    confiancaOcr: 88,
    imagemProcessada: "upload do computador com perspectiva retificada",
    observacoes: ["Matrícula foi usada para validar o aluno automaticamente."],
    respostas: [
      { questao: 1, respostaAluno: "A", respostaCorreta: "A", resultado: "acerto" },
      { questao: 2, respostaAluno: "C", respostaCorreta: "D", resultado: "erro" },
      { questao: 3, respostaAluno: "B", respostaCorreta: "B", resultado: "acerto" },
      { questao: 4, respostaAluno: "D", respostaCorreta: "D", resultado: "acerto" },
      { questao: 5, respostaAluno: "E", respostaCorreta: "E", resultado: "acerto" },
    ],
  },
];

export const dashboardMetrics: DashboardMetric[] = [
  { label: "Alunos ativos", value: "124", helper: "3 turmas sincronizadas", trend: "+8 este mês" },
  { label: "Provas criadas", value: "18", helper: "5 com gabarito pronto", trend: "+3 nesta semana" },
  { label: "Correções hoje", value: "42", helper: "Tempo médio 14s", trend: "+19% vs ontem" },
  { label: "Média geral", value: "78%", helper: "Entre todas as turmas", trend: "+4 pontos" },
];

export const classAverages = [
  { turma: "3A", media: 82 },
  { turma: "2B", media: 74 },
  { turma: "9A", media: 79 },
];

export const errorRanking = [
  { questao: "Q05", erros: 18 },
  { questao: "Q12", erros: 14 },
  { questao: "Q03", erros: 12 },
  { questao: "Q08", erros: 10 },
];

export const gradeEvolution = [
  { periodo: "Mar", media: 69 },
  { periodo: "Abr", media: 72 },
  { periodo: "Mai", media: 76 },
  { periodo: "Jun", media: 78 },
];
