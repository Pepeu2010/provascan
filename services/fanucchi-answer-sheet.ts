/**
 * Geometry for the Fanucchi OMR card. Values are deliberately expressed in
 * millimetres: the print renderer and the scanner can derive their pixels from
 * the same source instead of maintaining two approximate layouts.
 */
export const FANUCCHI_ANSWER_SHEET_VERSION = "FANUCCHI-OMR-V1";
export const FANUCCHI_ALTERNATIVES = ["A", "B", "C", "D", "E"] as const;

export type FanucchiArea = "HUMANAS" | "EXATAS";
export type MmRect = { x: number; y: number; width: number; height: number };
export type FanucchiBubble = { alternative: string; cx: number; cy: number; radius: number };
export type FanucchiQuestion = { number: number; column: number; row: number; bubbles: FanucchiBubble[] };

export const FANUCCHI_ANSWER_SHEET_GEOMETRY = {
  page: { width: 210, height: 297 },
  safeMargin: 10,
  fiducials: [
    { x: 4, y: 4, width: 6, height: 6 },
    { x: 200, y: 4, width: 6, height: 6 },
    { x: 4, y: 287, width: 6, height: 6 },
    { x: 200, y: 287, width: 6, height: 6 },
  ],
  header: { x: 31, y: 10, width: 148, height: 28 },
  categoryHeader: { x: 5, y: 42, width: 200, height: 20 },
  stickerArea: { x: 120, y: 67, width: 80, height: 47 },
  instructions: { x: 8, y: 67, width: 104, height: 48 },
  signature: { x: 58, y: 119, width: 94, height: 8 },
  markingGuide: { x: 5, y: 132, width: 200, height: 28 },
  // The heading occupies the first 13 mm of the visible answer frame. Bubble
  // coordinates start below it so the renderer and OMR share the same origin.
  answerArea: { x: 8, y: 177, width: 194, height: 103 },
  bubbleDiameter: 5.2,
  bubbleSpacing: 3,
  // 5.4 mm keeps a 5.2 mm bubble readable while accommodating 90 objective
  // questions on one physical A4 sheet.
  minRowSpacing: 5.4,
} as const;

function assertQuestionCount(questionCount: number) {
  if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 90) {
    throw new Error("O cartão Fanucchi aceita de 1 a 90 questões objetivas por folha.");
  }
}

/** Returns an exact, validated A–E layout without visual hard-coded ranges. */
export function calculateFanucchiAnswerSheetLayout(questionCount: number) {
  assertQuestionCount(questionCount);
  const geometry = FANUCCHI_ANSWER_SHEET_GEOMETRY;
  const area = geometry.answerArea;
  const maxRows = Math.floor(area.height / geometry.minRowSpacing);
  const columnCount = Math.max(1, Math.ceil(questionCount / maxRows));
  const rowsPerColumn = Math.ceil(questionCount / columnCount);
  const columnGap = columnCount > 1 ? 4 : 0;
  const columnWidth = (area.width - columnGap * (columnCount - 1)) / columnCount;
  const numberWidth = Math.max(7, Math.min(10, columnWidth * 0.22));
  const bubbleGap = (columnWidth - numberWidth) / FANUCCHI_ALTERNATIVES.length;
  const rowHeight = area.height / rowsPerColumn;
  const bubbleRadius = geometry.bubbleDiameter / 2;

  if (bubbleGap < geometry.bubbleDiameter || rowHeight < geometry.bubbleDiameter) {
    throw new Error("A quantidade de questões não cabe com bolhas legíveis neste cartão.");
  }

  const questions: FanucchiQuestion[] = Array.from({ length: questionCount }, (_, index) => {
    const column = Math.floor(index / rowsPerColumn);
    const row = index % rowsPerColumn;
    const columnLeft = area.x + column * (columnWidth + columnGap);
    const cy = area.y + row * rowHeight + rowHeight / 2;
    return {
      number: index + 1,
      column,
      row,
      bubbles: FANUCCHI_ALTERNATIVES.map((alternative, alternativeIndex) => ({
        alternative,
        cx: columnLeft + numberWidth + bubbleGap * alternativeIndex + bubbleGap / 2,
        cy,
        radius: bubbleRadius,
      })),
    };
  });

  validateFanucchiAnswerSheetLayout({ questionCount, questions });
  return { ...geometry, bubbleGap, bubbleRadius, columnCount, columnGap, columnWidth, numberWidth, questionCount, questions, rowsPerColumn, rowHeight, version: FANUCCHI_ANSWER_SHEET_VERSION };
}

export function validateFanucchiAnswerSheetLayout(layout: { questionCount: number; questions: FanucchiQuestion[] }) {
  const expected = Array.from({ length: layout.questionCount }, (_, index) => index + 1);
  const numbers = layout.questions.map((question) => question.number);
  if (numbers.length !== layout.questionCount || numbers.some((number, index) => number !== expected[index])) {
    throw new Error("A numeração do cartão-resposta não é contínua.");
  }
  const area = FANUCCHI_ANSWER_SHEET_GEOMETRY.answerArea;
  for (const question of layout.questions) {
    if (question.bubbles.length !== FANUCCHI_ALTERNATIVES.length || question.bubbles.some((bubble, index) => bubble.alternative !== FANUCCHI_ALTERNATIVES[index])) {
      throw new Error(`A questão ${question.number} não possui alternativas A–E completas.`);
    }
    for (const bubble of question.bubbles) {
      if (bubble.cx - bubble.radius < area.x || bubble.cx + bubble.radius > area.x + area.width || bubble.cy - bubble.radius < area.y || bubble.cy + bubble.radius > area.y + area.height) {
        throw new Error(`A bolha da questão ${question.number} está fora da área de respostas.`);
      }
    }
  }
}

export function getFanucchiBubbleBounds(params: { canvasWidth: number; canvasHeight: number; questionCount: number; questionIndex: number }) {
  const layout = calculateFanucchiAnswerSheetLayout(params.questionCount);
  const question = layout.questions[params.questionIndex];
  if (!question) return [];
  const scaleX = params.canvasWidth / layout.page.width;
  const scaleY = params.canvasHeight / layout.page.height;
  return question.bubbles.map((bubble) => ({
    alternative: bubble.alternative,
    cx: bubble.cx * scaleX,
    cy: bubble.cy * scaleY,
    radius: bubble.radius * Math.min(scaleX, scaleY),
  }));
}
