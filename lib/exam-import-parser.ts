import type { ExamQuestionType, TeacherExamInput } from "@/types/teacher-exams";

export type ImportedExamDraft = Pick<TeacherExamInput, "title" | "subject" | "instructions" | "questions"> & {
  warnings: string[];
};

const questionStart = /^(?:quest[aã]o\s*)?(\d{1,3})\s*[.)\-–:]\s*(.*)$/i;
const alternativeLine = /^([A-H])\s*[.)\-–:]\s*(.+)$/i;
const answerLine = /^(\d{1,3})\s*[.)\-–:]\s*([A-H])$/i;

function cleanLines(text: string) {
  return text
    .replaceAll("\u0000", "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 10_000);
}

function guessQuestionType(alternatives: string[]): ExamQuestionType {
  if (alternatives.length === 2 && alternatives.every((item) => /^(verdadeiro|falso|v|f)$/i.test(item))) return "verdadeiro_falso";
  return alternatives.length >= 2 ? "multipla_escolha" : "discursiva";
}

export function parseImportedExamText(text: string, fallbackTitle: string): ImportedExamDraft {
  const lines = cleanLines(text);
  const answers = new Map<number, string>();
  let answerKeyMode = false;
  for (const line of lines) {
    if (/^gabarito\b/i.test(line)) {
      answerKeyMode = true;
      const inline = line.replace(/^gabarito\s*[:\-]?\s*/i, "");
      for (const match of inline.matchAll(/(\d{1,3})\s*[.)\-–:]?\s*([A-H])\b/gi)) answers.set(Number(match[1]), match[2].toUpperCase());
      continue;
    }
    if (answerKeyMode) {
      const match = line.match(answerLine);
      if (match) answers.set(Number(match[1]), match[2].toUpperCase());
    }
  }

  const rawQuestions: Array<{ number: number; prompt: string[]; alternatives: Array<{ key: string; text: string }> }> = [];
  let current: (typeof rawQuestions)[number] | null = null;
  for (const line of lines) {
    if (/^gabarito\b/i.test(line)) break;
    const start = line.match(questionStart);
    if (start) {
      if (current) rawQuestions.push(current);
      current = { number: Number(start[1]), prompt: start[2] ? [start[2]] : [], alternatives: [] };
      continue;
    }
    if (!current) continue;
    const alternative = line.match(alternativeLine);
    if (alternative) current.alternatives.push({ key: alternative[1].toUpperCase(), text: alternative[2] });
    else current.prompt.push(line);
  }
  if (current) rawQuestions.push(current);

  const firstQuestionLine = lines.findIndex((line) => questionStart.test(line));
  const headingLines = lines.slice(0, firstQuestionLine >= 0 ? firstQuestionLine : Math.min(lines.length, 6));
  const detectedTitle = headingLines.find((line) => !/^(nome|aluno|turma|data|disciplina|instru[cç][oõ]es?)\b/i.test(line)) ?? fallbackTitle;
  const subjectLine = headingLines.find((line) => /^(disciplina|mat[eé]ria)\s*:/i.test(line));
  const instructionIndex = headingLines.findIndex((line) => /^instru[cç][oõ]es?\s*:/i.test(line));
  const warnings: string[] = [];

  let questions = rawQuestions.map((question, index) => {
    const alternatives = question.alternatives.map((item) => item.text);
    const answerLetter = answers.get(question.number);
    const answerIndex = answerLetter ? answerLetter.charCodeAt(0) - 65 : -1;
    const correctAnswer = alternatives[answerIndex];
    const type = guessQuestionType(alternatives);
    return {
      annulled: false,
      alternatives,
      correctAnswers: correctAnswer ? [correctAnswer] : [],
      correctionCriteria: type === "discursiva" ? "Revisar e informar o critério de correção." : "",
      correctionNotes: "",
      needsReview: !question.prompt.join(" ").trim() || (type === "multipla_escolha" && (!alternatives.length || !correctAnswer)),
      position: index + 1,
      prompt: question.prompt.join("\n").trim() || `Questão ${question.number}`,
      type,
      weight: 1,
    } satisfies TeacherExamInput["questions"][number];
  });

  if (!questions.length && lines.length) {
    const body = lines.slice(headingLines.length).join("\n").trim();
    questions = [{
      annulled: false,
      alternatives: [],
      correctAnswers: [],
      correctionCriteria: "Revisar e informar o critério de correção.",
      correctionNotes: "Conteúdo não segmentado automaticamente.",
      needsReview: true,
      position: 1,
      prompt: body || lines.join("\n"),
      type: "discursiva",
      weight: 1,
    }];
    warnings.push("Não foi possível separar as questões automaticamente. O texto foi preservado para revisão manual.");
  }
  if (!lines.length) warnings.push("O arquivo não possui texto legível. O original foi preservado; adicione as questões manualmente.");
  if (questions.some((question) => question.needsReview)) warnings.push("Algumas questões ou respostas precisam de revisão antes da publicação.");

  return {
    instructions: instructionIndex >= 0 ? headingLines.slice(instructionIndex).join("\n").replace(/^instru[cç][oõ]es?\s*:\s*/i, "") : "",
    questions,
    subject: subjectLine?.replace(/^(disciplina|mat[eé]ria)\s*:\s*/i, "").trim() ?? "",
    title: detectedTitle.slice(0, 200),
    warnings: [...new Set(warnings)],
  };
}
