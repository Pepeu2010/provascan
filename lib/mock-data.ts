import type {
  AnswerKey,
  ClassRoom,
  CorrectionSession,
  DashboardMetric,
  Exam,
  ExamCorrectionRule,
  Student,
  TeacherProfile,
} from "@/types/domain";

export const teacherProfile: TeacherProfile = {
  nome: "Prof. Helena Duarte",
  email: "helena@escolaexemplo.com",
  escola: "E.E Professor Fabio Fanucchi",
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
  {
    id: "P-301",
    titulo: "Simulado ENEM I",
    subject: "Matemática",
    audienceId: "ANO-3-INDEFINIDO-t-101",
    audienceLabel: "3º ano - Revisar agrupamento",
    groupType: "INDEFINIDO",
    yearSegment: "3",
    quantidadeQuestoes: 20,
    alternativas: ["A", "B", "C", "D", "E"],
    data: "2026-06-18",
    codigo: "ENEMI-3A-2026",
    templateVersion: "PS-CARD-1",
  },
  {
    id: "P-302",
    titulo: "Revisão de Química",
    subject: "Química",
    audienceId: "ANO-2-HUMANAS",
    audienceLabel: "2º ano - Humanas",
    groupType: "HUMANAS",
    yearSegment: "2",
    quantidadeQuestoes: 15,
    alternativas: ["A", "B", "C", "D", "E"],
    data: "2026-06-12",
    codigo: "QUI-2B-2026",
    templateVersion: "PS-CARD-1",
  },
  {
    id: "P-303",
    titulo: "Avaliação de Ciências",
    subject: "Ciências",
    audienceId: "ANO-OUTROS-TURMA-t-103",
    audienceLabel: "9º Ano A",
    groupType: "TURMA",
    yearSegment: "OUTROS",
    quantidadeQuestoes: 10,
    alternativas: ["A", "B", "C", "D"],
    data: "2026-06-06",
    codigo: "CIE-9A-2026",
    templateVersion: "PS-CARD-1",
  },
];

export const correctionRules: ExamCorrectionRule[] = [
  {
    provaId: "P-301",
    notaMaxima: 10,
    arredondamentoCasas: 1,
    pesoPadrao: 1,
    pesosPorQuestao: [
      { questao: 5, peso: 1.5 },
      { questao: 12, peso: 1.5 },
    ],
    questoesAnuladas: [7],
    modoQuestaoAnulada: "full-credit",
  },
  {
    provaId: "P-302",
    notaMaxima: 10,
    arredondamentoCasas: 1,
    pesoPadrao: 1,
    pesosPorQuestao: [],
    questoesAnuladas: [],
    modoQuestaoAnulada: "ignore",
  },
  {
    provaId: "P-303",
    notaMaxima: 10,
    arredondamentoCasas: 1,
    pesoPadrao: 1,
    pesosPorQuestao: [{ questao: 3, peso: 2 }],
    questoesAnuladas: [],
    modoQuestaoAnulada: "full-credit",
  },
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
  { provaId: "P-302", questao: 1, respostaCorreta: "A" },
  { provaId: "P-302", questao: 2, respostaCorreta: "D" },
  { provaId: "P-302", questao: 3, respostaCorreta: "B" },
  { provaId: "P-302", questao: 4, respostaCorreta: "D" },
  { provaId: "P-302", questao: 5, respostaCorreta: "E" },
  { provaId: "P-303", questao: 1, respostaCorreta: "A" },
  { provaId: "P-303", questao: 2, respostaCorreta: "B" },
  { provaId: "P-303", questao: 3, respostaCorreta: "C" },
  { provaId: "P-303", questao: 4, respostaCorreta: "D" },
];

export const correctionSessions: CorrectionSession[] = [
  {
    correction: {
      id: "C-900",
      provaId: "P-301",
      alunoId: "A-001",
      nomeDetectado: "Ana Beatriz Rocha",
      nota: 8.9,
      acertos: 5,
      erros: 1,
      emBranco: 1,
      multiplasMarcacoes: 0,
      anuladas: 1,
      percentual: 85,
      data: "2026-06-26T13:40:00.000Z",
      imagem: "camera-ana-beatriz.jpg",
      tempoCorrecao: "12s",
      metodoIdentificacao: "qr",
    },
    aluno: students[0],
    prova: exams[0],
    turma: classes[0],
    confiancaOcr: 94,
    identificacao: {
      method: "qr",
      qrCode: "{\"alunoId\":\"A-001\",\"correctionCode\":\"ENEMI-3A-2026-2026001-A-001\",\"provaId\":\"P-301\",\"turma\":\"T-101\"}",
      uniqueCode: "ENEMI-3A-2026-2026001-A-001",
    },
    imagemProcessada: "foto corrigida com contraste ajustado e grade identificada",
    observacoes: [
      "QR Code validou aluno e prova antes do OCR.",
      "Questão 5 ficou ambígua e exigiu revisão manual.",
    ],
    respostas: [
      { questao: 1, marcacoes: ["B"], respostaAluno: "B", respostaCorreta: "B", status: "acerto", pontuacao: 1, peso: 1 },
      { questao: 2, marcacoes: ["D"], respostaAluno: "D", respostaCorreta: "D", status: "acerto", pontuacao: 1, peso: 1 },
      { questao: 3, marcacoes: ["A"], respostaAluno: "A", respostaCorreta: "A", status: "acerto", pontuacao: 1, peso: 1 },
      { questao: 4, marcacoes: ["E"], respostaAluno: "E", respostaCorreta: "C", status: "erro", pontuacao: 0, peso: 1 },
      { questao: 5, marcacoes: ["E"], respostaAluno: "E", respostaCorreta: "E", status: "acerto", pontuacao: 1.5, peso: 1.5 },
      { questao: 6, marcacoes: [], respostaAluno: "Em branco", respostaCorreta: "A", status: "em-branco", pontuacao: 0, peso: 1 },
      { questao: 7, marcacoes: ["A"], respostaAluno: "A", respostaCorreta: "C", status: "anulada", pontuacao: 1, peso: 1 },
      { questao: 8, marcacoes: ["B"], respostaAluno: "B", respostaCorreta: "B", status: "acerto", pontuacao: 1, peso: 1 },
    ],
  },
  {
    correction: {
      id: "C-901",
      provaId: "P-302",
      alunoId: "A-003",
      nomeDetectado: "Lucas Prado",
      nota: 6.0,
      acertos: 3,
      erros: 1,
      emBranco: 0,
      multiplasMarcacoes: 1,
      anuladas: 0,
      percentual: 60,
      data: "2026-06-25T16:10:00.000Z",
      imagem: "upload-lucas.png",
      tempoCorrecao: "18s",
      metodoIdentificacao: "ocr",
    },
    aluno: students[2],
    prova: exams[1],
    turma: classes[1],
    confiancaOcr: 88,
    identificacao: {
      method: "ocr",
      qrCode: "",
      uniqueCode: "QUI-2B-2026-2026003-A-003",
    },
    imagemProcessada: "upload do computador com perspectiva retificada",
    observacoes: ["Matrícula foi usada para validar o aluno automaticamente."],
    respostas: [
      { questao: 1, marcacoes: ["A"], respostaAluno: "A", respostaCorreta: "A", status: "acerto", pontuacao: 1, peso: 1 },
      { questao: 2, marcacoes: ["C"], respostaAluno: "C", respostaCorreta: "D", status: "erro", pontuacao: 0, peso: 1 },
      { questao: 3, marcacoes: ["B"], respostaAluno: "B", respostaCorreta: "B", status: "acerto", pontuacao: 1, peso: 1 },
      { questao: 4, marcacoes: ["D"], respostaAluno: "D", respostaCorreta: "D", status: "acerto", pontuacao: 1, peso: 1 },
      { questao: 5, marcacoes: ["A", "E"], respostaAluno: "A/E", respostaCorreta: "E", status: "multipla-marcacao", pontuacao: 0, peso: 1 },
    ],
  },
];

export const dashboardMetrics: DashboardMetric[] = [
  { label: "Alunos ativos", value: "4", helper: "1 transferido na base local", trend: "Base pronta para correção" },
  { label: "Provas criadas", value: "3", helper: "3 com regras de correção", trend: "Cartão padrão disponível" },
  { label: "Correções hoje", value: "2", helper: "Tempo médio 15s", trend: "Revisão manual ativa" },
  { label: "Média geral", value: "73%", helper: "Entre todas as turmas", trend: "Atualizado pelo armazenamento local" },
];

export const classAverages = [
  { turma: "3A", media: 85 },
  { turma: "2B", media: 60 },
  { turma: "9A", media: 0 },
];

export const errorRanking = [
  { questao: "Q04", erros: 1 },
  { questao: "Q02", erros: 1 },
  { questao: "Q05", erros: 1 },
  { questao: "Q06", erros: 1 },
];

export const gradeEvolution = [
  { periodo: "Mar", media: 69 },
  { periodo: "Abr", media: 72 },
  { periodo: "Mai", media: 76 },
  { periodo: "Jun", media: 73 },
];
