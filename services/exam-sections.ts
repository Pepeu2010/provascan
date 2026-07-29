import type { Exam, ExamSection } from "@/types/domain";

export type ResolvedExamSection = ExamSection & {
  questionEnd: number;
  questionStart: number;
};

export type SegmentedAnswerBlock = ResolvedExamSection & {
  searchWindow: { height: number; width: number; x: number; y: number };
};

const DEFAULT_SUBJECT = "Conhecimentos gerais";

export function normalizeExamSections(sections: ExamSection[] | undefined, totalQuestions: number, fallbackSubject?: string) {
  const valid = (sections ?? [])
    .map((section, index) => ({
      id: section.id || `B${index + 1}`,
      questionCount: Math.max(1, Math.min(200, Math.trunc(Number(section.questionCount) || 0))),
      subject: section.subject.trim(),
    }))
    .filter((section) => section.subject && section.questionCount > 0);

  if (!valid.length || valid.reduce((sum, section) => sum + section.questionCount, 0) !== totalQuestions) {
    return [{ id: "GERAL", questionCount: totalQuestions, subject: fallbackSubject?.trim() || DEFAULT_SUBJECT }];
  }

  return valid;
}

export function resolveExamSections(exam: Pick<Exam, "quantidadeQuestoes" | "sections" | "subject">): ResolvedExamSection[] {
  let questionStart = 1;
  return normalizeExamSections(exam.sections, exam.quantidadeQuestoes, exam.subject).map((section) => {
    const resolved = {
      ...section,
      questionEnd: questionStart + section.questionCount - 1,
      questionStart,
    };
    questionStart = resolved.questionEnd + 1;
    return resolved;
  });
}

/**
 * A shared two-column grid for the segmented ProvaScan card. Both the
 * generated document and OMR use these normalized rectangles, so a labelled
 * discipline block never changes the answer coordinates by itself.
 */
export function getSegmentedAnswerBlocks(exam: Pick<Exam, "quantidadeQuestoes" | "sections" | "subject">): SegmentedAnswerBlock[] {
  const sections = resolveExamSections(exam);
  const columns: ResolvedExamSection[][] = [[], []];
  const weights = [0, 0];

  for (const section of sections) {
    const column = weights[0] <= weights[1] ? 0 : 1;
    columns[column].push(section);
    weights[column] += getSectionWeight(section.questionCount);
  }

  const blockById = new Map<string, SegmentedAnswerBlock>();
  const top = 0.315;
  const availableHeight = 0.56;
  const left = 0.07;
  const columnWidth = 0.405;
  const columnGap = 0.055;
  const blockGap = 0.016;

  columns.forEach((column, columnIndex) => {
    const totalWeight = column.reduce((sum, section) => sum + getSectionWeight(section.questionCount), 0);
    const gaps = Math.max(0, column.length - 1) * blockGap;
    const scale = totalWeight ? Math.min(1, (availableHeight - gaps) / totalWeight) : 1;
    let cursor = top;

    for (const section of column) {
      const height = getSectionWeight(section.questionCount) * scale;
      blockById.set(section.id, {
        ...section,
        searchWindow: {
          height,
          width: columnWidth,
          x: left + columnIndex * (columnWidth + columnGap),
          y: cursor,
        },
      });
      cursor += height + blockGap;
    }
  });

  return sections.map((section) => blockById.get(section.id)!).filter(Boolean);
}

export const SEGMENTED_BLOCK_METRICS = {
  bubbleEnd: 0.87,
  bubbleStart: 0.31,
  contentBottom: 0.92,
  contentTop: 0.2,
  radiusFactor: 0.034,
} as const;

function getSectionWeight(questionCount: number) {
  return 0.045 + questionCount * 0.012;
}
