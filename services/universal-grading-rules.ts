import type { UniversalDetectedAnswer, UniversalExamStructure } from "@/services/universal-exam-core";

export type UniversalGradingRules = {
  annulledPolicy: "full_credit" | "ignore";
  annulledQuestions: number[];
  defaultWeight: number;
  maxScore: number;
  multipleMarksPolicy: "blank" | "incorrect" | "review";
  questionWeights: Record<number, number>;
};

export const DEFAULT_UNIVERSAL_GRADING_RULES: UniversalGradingRules = {
  annulledPolicy: "full_credit",
  annulledQuestions: [],
  defaultWeight: 1,
  maxScore: 10,
  multipleMarksPolicy: "review",
  questionWeights: {},
};

export function gradeWithRules(input: {
  answerKey: string[];
  answers: UniversalDetectedAnswer[];
  rules: UniversalGradingRules;
  structure: UniversalExamStructure;
}) {
  const annulled = new Set(input.rules.annulledQuestions);
  const rows = input.answerKey.map((correctAnswer, index) => {
    const question = index + 1;
    const detected = input.answers.find((item) => item.question === question) ?? { confidence: 0, detectedAnswers: [], question, status: "uncertain" as const };
    const weight = positive(input.rules.questionWeights[question] ?? input.rules.defaultWeight, 1);
    let outcome: "annulled" | "blank" | "correct" | "incorrect" | "review" = "incorrect";
    if (annulled.has(question)) outcome = "annulled";
    else if (detected.status === "blank") outcome = "blank";
    else if (detected.status === "multiple_marks") outcome = input.rules.multipleMarksPolicy === "review" ? "review" : input.rules.multipleMarksPolicy;
    else if (detected.status !== "marked") outcome = "review";
    else outcome = detected.detectedAnswers[0] === correctAnswer ? "correct" : "incorrect";
    const earnedWeight = outcome === "correct" || (outcome === "annulled" && input.rules.annulledPolicy === "full_credit") ? weight : 0;
    const denominatorWeight = outcome === "annulled" && input.rules.annulledPolicy === "ignore" ? 0 : weight;
    return { ...detected, correctAnswer, denominatorWeight, earnedWeight, outcome, weight };
  });
  const denominator = rows.reduce((sum, row) => sum + row.denominatorWeight, 0);
  const earned = rows.reduce((sum, row) => sum + row.earnedWeight, 0);
  const reviewQuestions = rows.filter((row) => row.outcome === "review").map((row) => row.question);
  const subjects = input.structure.subjects.map((subject) => {
    const subjectRows = rows.filter((row) => row.question >= subject.questionStart && row.question <= subject.questionEnd);
    const subjectDenominator = subjectRows.reduce((sum, row) => sum + row.denominatorWeight, 0);
    const subjectEarned = subjectRows.reduce((sum, row) => sum + row.earnedWeight, 0);
    return {
      correct: subjectRows.filter((row) => row.outcome === "correct" || (row.outcome === "annulled" && input.rules.annulledPolicy === "full_credit")).length,
      name: subject.name,
      questionEnd: subject.questionEnd,
      questionStart: subject.questionStart,
      score: round(subjectDenominator ? subjectEarned / subjectDenominator * input.rules.maxScore : input.rules.maxScore),
    };
  });
  return {
    reviewQuestions,
    rows,
    subjects,
    summary: {
      annulled: rows.filter((row) => row.outcome === "annulled").length,
      blank: rows.filter((row) => row.outcome === "blank").length,
      correct: rows.filter((row) => row.outcome === "correct").length,
      incorrect: rows.filter((row) => row.outcome === "incorrect").length,
      multipleMarks: rows.filter((row) => row.status === "multiple_marks").length,
      review: reviewQuestions.length,
      score: round(denominator ? earned / denominator * positive(input.rules.maxScore, 10) : positive(input.rules.maxScore, 10)),
    },
  };
}

function positive(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
