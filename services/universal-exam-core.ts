export type UniversalMarkStatus =
  | "marked"
  | "blank"
  | "multiple_marks"
  | "uncertain"
  | "erasure_suspected";

export type ExamSubjectRegion = {
  id: string;
  name: string;
  questionEnd: number;
  questionStart: number;
};

export type UniversalExamStructure = {
  alternatives: string[];
  columnCount: number;
  confidence: number;
  source: "detected" | "manual" | "saved_template" | "provascan";
  subjects: ExamSubjectRegion[];
  totalQuestions: number;
};

export type UniversalDetectedAnswer = {
  confidence: number;
  detectedAnswers: string[];
  question: number;
  status: UniversalMarkStatus;
};

const roundConfidence = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;

export function buildExamStructure(input: {
  alternativeCount: number;
  columnCount?: number;
  confidence?: number;
  source?: UniversalExamStructure["source"];
  subjectNames: string[];
  questionsPerSubject: number[];
}): UniversalExamStructure {
  const alternativeCount = Math.max(2, Math.min(10, Math.trunc(input.alternativeCount)));
  const alternatives = alternativeCount === 2
    ? ["V", "F"]
    : Array.from({ length: alternativeCount }, (_, index) => String.fromCharCode(65 + index));
  let questionStart = 1;
  const subjects = input.questionsPerSubject.map((questionCount, index) => {
    const normalizedCount = Math.max(0, Math.trunc(questionCount));
    const subject = {
      id: `subject-${index + 1}`,
      name: input.subjectNames[index]?.trim() || `Matéria ${index + 1}`,
      questionEnd: questionStart + normalizedCount - 1,
      questionStart,
    };
    questionStart += normalizedCount;
    return subject;
  });

  return {
    alternatives,
    columnCount: Math.max(1, Math.min(8, Math.trunc(input.columnCount ?? 1))),
    confidence: roundConfidence(input.confidence ?? 1),
    source: input.source ?? "manual",
    subjects,
    totalQuestions: questionStart - 1,
  };
}

export function validateExamStructure(structure: UniversalExamStructure) {
  const errors: string[] = [];
  if (structure.totalQuestions < 1 || structure.totalQuestions > 200) {
    errors.push("A estrutura deve ter entre 1 e 200 questões.");
  }
  if (structure.alternatives.length < 2 || structure.alternatives.length > 10) {
    errors.push("A estrutura deve ter entre 2 e 10 alternativas.");
  }
  if (!structure.subjects.length) errors.push("Informe ao menos uma matéria ou bloco.");

  let expectedStart = 1;
  for (const subject of structure.subjects) {
    if (!subject.name.trim()) errors.push("Todas as matérias precisam de nome.");
    if (subject.questionStart !== expectedStart || subject.questionEnd < subject.questionStart) {
      errors.push(`Revise o intervalo de ${subject.name || "matéria sem nome"}.`);
    }
    expectedStart = subject.questionEnd + 1;
  }
  if (expectedStart - 1 !== structure.totalQuestions) {
    errors.push("Os intervalos das matérias não correspondem ao total de questões.");
  }
  return [...new Set(errors)];
}

export function inferSubjectsFromText(rawText: string, totalQuestions: number): ExamSubjectRegion[] {
  const detected = rawText
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .map((line) => line.match(/^(.{2,80}?)\s+(\d{1,3})\s*(?:-|–|—|a)\s*(\d{1,3})(?:\b|$)/iu))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match, index) => ({
      id: `subject-${index + 1}`,
      name: match[1].replace(/[\s:–—-]+$/, "").trim(),
      questionEnd: Number(match[3]),
      questionStart: Number(match[2]),
    }))
    .sort((left, right) => left.questionStart - right.questionStart)
    .map((subject, index) => ({ ...subject, id: `subject-${index + 1}` }));
  if (!detected.length || detected[0].questionStart !== 1 || detected.at(-1)?.questionEnd !== totalQuestions) return [];
  if (detected.some((subject, index) => subject.questionEnd < subject.questionStart || (index > 0 && subject.questionStart !== detected[index - 1].questionEnd + 1))) return [];
  return detected;
}

export function classifyUniversalMarks(scores: number[]): {
  confidence: number;
  markedIndexes: number[];
  status: UniversalMarkStatus;
} {
  if (!scores.length) return { confidence: 0, markedIndexes: [], status: "uncertain" };
  const ranked = scores
    .map((score, index) => ({ index, score: Math.max(0, Math.min(1, score)) }))
    .sort((left, right) => right.score - left.score);
  const strongest = ranked[0];
  const second = ranked[1]?.score ?? 0;
  const strongMarks = ranked.filter((item) => item.score >= 0.72);

  if (strongMarks.length > 1) {
    return {
      confidence: roundConfidence(strongMarks.reduce((sum, item) => sum + item.score, 0) / strongMarks.length),
      markedIndexes: strongMarks.map((item) => item.index).sort((a, b) => a - b),
      status: "multiple_marks",
    };
  }
  if (strongest.score >= 0.72 && second >= 0.32) {
    return {
      confidence: roundConfidence(Math.min(strongest.score, 1 - Math.abs(strongest.score - second))),
      markedIndexes: [strongest.index],
      status: "erasure_suspected",
    };
  }
  if (strongest.score >= 0.72) {
    return { confidence: roundConfidence(strongest.score), markedIndexes: [strongest.index], status: "marked" };
  }
  if (strongest.score < 0.32) {
    return { confidence: roundConfidence(1 - strongest.score), markedIndexes: [], status: "blank" };
  }
  return { confidence: roundConfidence(strongest.score), markedIndexes: [strongest.index], status: "uncertain" };
}

export function normalizeAnswerKey(raw: string, alternatives: string[], questionCount: number) {
  const normalizedAlternatives = new Set(alternatives.map((item) => item.trim().toUpperCase()));
  const answers = Array<string>(questionCount).fill("");
  for (const line of raw.split(/\r?\n|[,;]+/)) {
    const match = line.trim().toUpperCase().match(/^(\d+)\s*[-.:)]?\s*([A-Z])$/);
    if (!match) continue;
    const question = Number(match[1]);
    const answer = match[2];
    if (question < 1 || question > questionCount) throw new Error(`Questão ${question} está fora do intervalo da prova.`);
    if (!normalizedAlternatives.has(answer)) throw new Error(`Questão ${question}: alternativa ${answer} não existe nesta prova.`);
    answers[question - 1] = answer;
  }
  const missing = answers.findIndex((answer) => !answer);
  if (missing >= 0) throw new Error(`Questão ${missing + 1}: informe uma resposta válida.`);
  return answers;
}

export function gradeObjectiveAnswers(input: {
  answerKey: string[];
  answers: UniversalDetectedAnswer[];
  maxScore: number;
}) {
  const rows = input.answerKey.map((correctAnswer, index) => {
    const detected = input.answers.find((item) => item.question === index + 1) ?? {
      confidence: 0,
      detectedAnswers: [],
      question: index + 1,
      status: "uncertain" as const,
    };
    const outcome = detected.status === "blank"
      ? "blank"
      : detected.status === "multiple_marks"
        ? "multiple_marks"
        : detected.status !== "marked"
          ? "review"
          : detected.detectedAnswers[0] === correctAnswer
            ? "correct"
            : "incorrect";
    return { ...detected, correctAnswer, outcome };
  });
  const correct = rows.filter((row) => row.outcome === "correct").length;
  const blank = rows.filter((row) => row.outcome === "blank").length;
  const multipleMarks = rows.filter((row) => row.outcome === "multiple_marks").length;
  const reviewQuestions = rows
    .filter((row) => row.outcome === "review" || row.outcome === "multiple_marks")
    .map((row) => row.question);
  const incorrect = rows.length - correct - blank - multipleMarks;

  return {
    rows,
    reviewQuestions,
    summary: {
      blank,
      correct,
      incorrect,
      multipleMarks,
      review: reviewQuestions.length,
      score: Math.round((correct / Math.max(rows.length, 1)) * input.maxScore * 100) / 100,
    },
  };
}
