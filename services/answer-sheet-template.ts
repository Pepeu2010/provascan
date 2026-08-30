export const ANSWER_SHEET_TEMPLATE = {
  answerArea: {
    height: 0.5,
    width: 0.78,
    x: 0.11,
    y: 0.31,
  },
  page: {
    height: 1123,
    width: 794,
  },
  qrArea: {
    height: 0.15,
    width: 0.15,
    x: 0.73,
    y: 0.11,
  },
  version: "PS-CARD-2",
} as const;

export function getQuestionLayout(questionCount: number, alternatives: string[]) {
  const { answerArea, page } = ANSWER_SHEET_TEMPLATE;
  const x = answerArea.x * page.width;
  const y = answerArea.y * page.height;
  const width = answerArea.width * page.width;
  const height = answerArea.height * page.height;
  // Fifteen rows keep the printed bubbles and their OCR sampling area legible.
  // More questions expand into another column instead of compressing a row.
  const columnCount = Math.max(1, Math.ceil(questionCount / 15));
  const columnGap = columnCount > 1 ? 20 : 0;
  const columnWidth = (width - columnGap * (columnCount - 1)) / columnCount;
  const rowsPerColumn = Math.ceil(questionCount / columnCount);
  const rowHeight = height / Math.max(rowsPerColumn, 1);
  const numberColumnWidth = Math.max(32, Math.min(54, columnWidth * 0.18));
  const bubbleTrackWidth = columnWidth - numberColumnWidth - 12;
  const bubbleGap = bubbleTrackWidth / Math.max(alternatives.length, 1);
  const bubbleRadius = Math.min(15, rowHeight * 0.26, bubbleGap * 0.24);

  return {
    bubbleGap,
    bubbleRadius,
    bubbleTrackWidth,
    columnCount,
    columnGap,
    columnWidth,
    height,
    numberColumnWidth,
    rowHeight,
    rowsPerColumn,
    width,
    x,
    y,
  };
}

export function getBubbleBounds(params: {
  alternatives: string[];
  canvasHeight: number;
  canvasWidth: number;
  questionCount: number;
  questionIndex: number;
}) {
  const { alternatives, canvasHeight, canvasWidth, questionCount, questionIndex } = params;
  const scaleX = canvasWidth / ANSWER_SHEET_TEMPLATE.page.width;
  const scaleY = canvasHeight / ANSWER_SHEET_TEMPLATE.page.height;
  const layout = getQuestionLayout(questionCount, alternatives);
  const columnIndex = Math.floor(questionIndex / layout.rowsPerColumn);
  const rowIndex = questionIndex % layout.rowsPerColumn;
  const columnLeft = layout.x + columnIndex * (layout.columnWidth + layout.columnGap);
  const rowTop = layout.y + layout.rowHeight * rowIndex;
  const cy = rowTop + layout.rowHeight / 2;

  return alternatives.map((alternative, index) => {
    const cx = columnLeft + layout.numberColumnWidth + layout.bubbleGap * index + layout.bubbleGap / 2;

    return {
      alternative,
      cx: cx * scaleX,
      cy: cy * scaleY,
      radius: Math.max(7, layout.bubbleRadius * Math.min(scaleX, scaleY)),
    };
  });
}
