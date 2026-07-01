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
  const rowHeight = height / Math.max(questionCount, 1);
  const numberColumnWidth = Math.max(54, width * 0.12);
  const bubbleTrackWidth = width - numberColumnWidth - 20;
  const bubbleGap = bubbleTrackWidth / Math.max(alternatives.length, 1);
  const bubbleRadius = Math.min(15, rowHeight * 0.22, bubbleGap * 0.18);

  return {
    bubbleGap,
    bubbleRadius,
    bubbleTrackWidth,
    height,
    numberColumnWidth,
    rowHeight,
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
  const rowTop = layout.y + layout.rowHeight * questionIndex;
  const cy = rowTop + layout.rowHeight / 2;

  return alternatives.map((alternative, index) => {
    const cx = layout.x + layout.numberColumnWidth + layout.bubbleGap * index + layout.bubbleGap / 2;

    return {
      alternative,
      cx: cx * scaleX,
      cy: cy * scaleY,
      radius: Math.max(7, layout.bubbleRadius * Math.min(scaleX, scaleY)),
    };
  });
}
