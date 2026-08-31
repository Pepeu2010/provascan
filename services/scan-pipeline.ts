import {
  ANSWER_SHEET_MODELS,
  findAnswerSheetModelById,
  getAnswerSheetQuestionCount,
  normalizeTemplateToken,
  type AnswerSheetBlockModel,
  type AnswerSheetModel,
  type AnswerSheetPageType,
  type BlockLayoutStyle,
  type NormalizedRect,
} from "@/services/answer-sheet-models";
import { ANSWER_SHEET_TEMPLATE, getBubbleBounds, getQuestionLayout } from "@/services/answer-sheet-template";
import { extractIdentityFromImage, extractTextFromImage } from "@/services/ocr";
import { buildIdentificationCode } from "@/services/exam-correction";
import type { Exam, Student } from "@/types/domain";

export type QrPayload = {
  alunoId: string;
  correctionCode: string;
  provaId: string;
  turma: string;
};

export type QrScanResult =
  | {
      payload: QrPayload;
      rawText: string;
      status: "success";
    }
  | {
      message: string;
      rawText?: string;
      status: "invalid" | "not-found" | "unreadable";
    };

export type OcrFallbackResult = {
  confidence: number;
  detectedName: string;
  rawText: string;
  status: "matched" | "not-found";
  studentId: string;
};

export type AnswerBubbleScore = {
  alternative: string;
  score: number;
};

export type AnswerReadStatus = "BLANK" | "LOW_CONFIDENCE" | "MARKED" | "MULTIPLE";

export type BubbleAnswerDetection = {
  blockTitle: string;
  confidence: number;
  markedAnswers: string[];
  question: number;
  scores: AnswerBubbleScore[];
  status: AnswerReadStatus;
};

export type AnswerSheetBlockAudit = {
  averageConfidence: number;
  questionCount: number;
  questionStart: number;
  rect: {
    height: number;
    width: number;
    x: number;
    y: number;
  };
  title: string;
};

export type AnswerSheetAnalysis = {
  answers: BubbleAnswerDetection[];
  blockAudits: AnswerSheetBlockAudit[];
  headerConfidence: number;
  headerText: string;
  modelConfidence: number;
  modelDisplayName: string;
  pageType: AnswerSheetPageType;
  templateId: string;
  totalQuestions: number;
  usedExpectedTemplate: boolean;
};

type RectPixels = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type LayoutMetrics = {
  bubbleEnd: number;
  bubbleStart: number;
  contentBottom: number;
  contentTop: number;
  radiusFactor: number;
};

const DARK_PIXEL_THRESHOLD = 140;
const HEADER_CROP = {
  height: 0.24,
  width: 0.86,
  x: 0.07,
  y: 0.03,
} as const;

export async function decodeQrFromCanvas(canvas: HTMLCanvasElement): Promise<QrScanResult> {
  try {
    const jsqr = (await import("jsqr")).default;
    const attempts = buildQrScanCandidates(canvas);

    for (const candidate of attempts) {
      const context = candidate.getContext("2d", { willReadFrequently: true });
      if (!context) {
        continue;
      }

      const imageData = context.getImageData(0, 0, candidate.width, candidate.height);
      const result = jsqr(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

      if (!result?.data) {
        continue;
      }

      try {
        const parsed = JSON.parse(result.data) as Partial<QrPayload>;
        if (
          typeof parsed.alunoId !== "string" ||
          typeof parsed.correctionCode !== "string" ||
          typeof parsed.provaId !== "string" ||
          typeof parsed.turma !== "string"
        ) {
          return {
            message: "QR Code lido, mas os dados nao seguem o formato esperado do ProvaScan.",
            rawText: result.data,
            status: "invalid",
          };
        }

        return {
          payload: {
            alunoId: parsed.alunoId,
            correctionCode: parsed.correctionCode,
            provaId: parsed.provaId,
            turma: parsed.turma,
          },
          rawText: result.data,
          status: "success",
        };
      } catch {
        return {
          message: "QR Code encontrado, mas o conteudo nao e um JSON valido.",
          rawText: result.data,
          status: "invalid",
        };
      }
    }

    return {
      message: "Nenhum QR Code legivel foi encontrado na imagem.",
      status: "not-found",
    };
  } catch {
    return {
      message: "Falha ao decodificar o QR Code desta imagem.",
      status: "unreadable",
    };
  }
}

export async function detectIdentityWithOcr(params: {
  canvas: HTMLCanvasElement;
  preferredStudentId: string;
  students: Student[];
}) {
  const { canvas, students } = params;
  const headerCanvas = cropCanvas(canvas, {
    height: Math.round(canvas.height * 0.24),
    width: Math.round(canvas.width * 0.78),
    x: Math.round(canvas.width * 0.08),
    y: Math.round(canvas.height * 0.08),
  });
  const result = await extractIdentityFromImage(headerCanvas.toDataURL("image/jpeg", 0.92));
  const normalized = normalizeText(result.rawText || result.nomeDetectado);
  const byName = students.find((student) => {
    const tokens = student.nome.split(" ").map((token) => normalizeText(token)).filter((token) => token.length >= 3);
    return tokens.some((token) => normalized.includes(token));
  });
  const matchedStudent = byName;

  return {
    confidence: result.confianca,
    detectedName: matchedStudent?.nome ?? "",
    rawText: result.rawText,
    status: matchedStudent ? "matched" : "not-found",
    studentId: matchedStudent?.id ?? "",
  } satisfies OcrFallbackResult;
}

export async function analyzeAnswerSheetCanvas(params: {
  alternatives?: string[];
  answerKeyLength?: number;
  canvas: HTMLCanvasElement;
  expectedTemplateId?: string;
}) {
  const { alternatives = ["A", "B", "C", "D", "E"], answerKeyLength, canvas, expectedTemplateId } = params;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Não foi possível analisar as marcações da imagem.");
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const headerCanvas = cropCanvas(canvas, {
    height: Math.round(canvas.height * HEADER_CROP.height),
    width: Math.round(canvas.width * HEADER_CROP.width),
    x: Math.round(canvas.width * HEADER_CROP.x),
    y: Math.round(canvas.height * HEADER_CROP.y),
  });

  let headerText = "";
  let headerConfidence = 0;
  try {
    const headerResult = await extractTextFromImage(headerCanvas.toDataURL("image/jpeg", 0.92));
    headerText = headerResult.rawText;
    headerConfidence = Math.round(headerResult.confidence);
  } catch {
    headerText = "";
    headerConfidence = 0;
  }

  const selectedModel = selectAnswerSheetModel({
    answerKeyLength,
    expectedTemplateId,
    headerText,
  });

  // A prova pode estar cadastrada como PS-CARD e, ainda assim, o professor
  // enviar uma folha externa da escola. Só substituímos a geometria linear
  // quando o cabeçalho identifica inequivocamente o modelo ProvaScan.
  if (isProvaScanCard(expectedTemplateId) && !isExternalSchoolAnswerSheet(headerText)) {
    return analyzeProvaScanCard({ alternatives, answerKeyLength, imageData });
  }

  const answers: BubbleAnswerDetection[] = [];
  const blockAudits: AnswerSheetBlockAudit[] = [];
  let questionStart = 1;

  for (const block of selectedModel.model.blocks) {
    const rect = fitRectToBorder(imageData, block.searchWindow);
    const blockAnswers = readBlockAnswers({
      alternatives,
      block,
      imageData,
      layoutStyle: selectedModel.model.layoutStyle,
      questionStart,
      rect,
    });

    answers.push(...blockAnswers);
    blockAudits.push({
      averageConfidence: average(blockAnswers.map((item) => item.confidence)),
      questionCount: block.questionCount,
      questionStart,
      rect,
      title: block.title,
    });
    questionStart += block.questionCount;
  }

  return {
    answers,
    blockAudits,
    headerConfidence,
    headerText,
    modelConfidence: selectedModel.score,
    modelDisplayName: selectedModel.model.displayName,
    pageType: selectedModel.model.pageType,
    templateId: selectedModel.model.id,
    totalQuestions: getAnswerSheetQuestionCount(selectedModel.model),
    usedExpectedTemplate: selectedModel.usedExpectedTemplate,
  } satisfies AnswerSheetAnalysis;
}

export async function detectAnswersFromCanvas(params: {
  alternatives?: string[];
  answerKeyLength?: number;
  canvas: HTMLCanvasElement;
  expectedTemplateId?: string;
}) {
  const result = await analyzeAnswerSheetCanvas(params);
  return result.answers;
}


function analyzeProvaScanCard(params: {
  alternatives: string[];
  answerKeyLength?: number;
  imageData: ImageData;
}) {
  const { alternatives, answerKeyLength, imageData } = params;
  if (!answerKeyLength || answerKeyLength < 1) {
    throw new Error("Informe a quantidade de questões do gabarito antes de ler o cartão.");
  }

  // A phone photo may retain a few pixels of table/background even after the
  // page is rectified. Anchor the bubbles to the printed answer-frame itself
  // so this residual margin cannot shift an entire column.
  const answerRect = fitRectToBorder(imageData, ANSWER_SHEET_TEMPLATE.answerArea);
  const expectedRect = normalizedRectToPixels(
    ANSWER_SHEET_TEMPLATE.answerArea,
    imageData.width,
    imageData.height,
  );

  const standardAnswers = readProvaScanCardAnswers({
    alternatives,
    answerKeyLength,
    getBounds: (questionIndex) => {
    const expectedBounds = getBubbleBounds({
      alternatives,
      canvasHeight: imageData.height,
      canvasWidth: imageData.width,
      questionCount: answerKeyLength,
      questionIndex,
    });
    const bounds = expectedBounds.map((bound) => ({
      alternative: bound.alternative,
      cx: answerRect.x + ((bound.cx - expectedRect.x) / expectedRect.width) * answerRect.width,
      cy: answerRect.y + ((bound.cy - expectedRect.y) / expectedRect.height) * answerRect.height,
      radius: Math.max(
        7,
        bound.radius * Math.min(answerRect.width / expectedRect.width, answerRect.height / expectedRect.height),
      ),
    }));
    return bounds;
    },
    imageData,
  });
  const compactPrintAnswers = readProvaScanCardAnswers({
    alternatives,
    answerKeyLength,
    getBounds: (questionIndex) => getCompactPrintBubbleBounds({
      alternatives,
      canvasHeight: imageData.height,
      canvasWidth: imageData.width,
      questionCount: answerKeyLength,
      questionIndex,
    }),
    imageData,
  });
  const templateAnswers = readProvaScanCardAnswers({
    alternatives,
    answerKeyLength,
    getBounds: (questionIndex) => getBubbleBounds({
      alternatives,
      canvasHeight: imageData.height,
      canvasWidth: imageData.width,
      questionCount: answerKeyLength,
      questionIndex,
    }),
    imageData,
  });
  const inkGridAnswers = readBlueInkGridAnswers({ alternatives, answerKeyLength, imageData });
  const answers = inkGridAnswers.length
    ? inkGridAnswers
    : [standardAnswers, compactPrintAnswers, templateAnswers].reduce((best, candidate) =>
      scoreProvaScanCardAnswers(candidate) > scoreProvaScanCardAnswers(best) ? candidate : best,
    );

  return {
    answers,
    blockAudits: [{
      averageConfidence: average(answers.map((item) => item.confidence)),
      questionCount: answerKeyLength,
      questionStart: 1,
      rect: answerRect,
      title: "CARTÃO-RESPOSTA",
    }],
    headerConfidence: 100,
    headerText: ANSWER_SHEET_TEMPLATE.version,
    modelConfidence: 100,
    modelDisplayName: "Cartão-resposta padrão ProvaScan",
    pageType: "EXATAS_E_HUMANAS" as const,
    templateId: ANSWER_SHEET_TEMPLATE.version,
    totalQuestions: answerKeyLength,
    usedExpectedTemplate: true,
  } satisfies AnswerSheetAnalysis;
}

type BlueInkComponent = { area: number; x: number; y: number };

function readBlueInkGridAnswers(params: {
  alternatives: string[];
  answerKeyLength: number;
  imageData: ImageData;
}) {
  const { alternatives, answerKeyLength, imageData } = params;
  const layout = getQuestionLayout(answerKeyLength, alternatives);
  // The answer grid starts well inside the printed frame. A blue object at
  // the frame edge is commonly the blue border/reflection, not a response.
  // Keep a generous margin for photographed cards while excluding that edge
  // noise (which would otherwise stretch the A-E calibration range).
  const components = keepLargestInkGrid(
    detectBlueInkComponents(imageData)
      .filter((component) =>
        component.x > imageData.width * 0.16 &&
        component.x < imageData.width * 0.88 &&
        // Printed headings and footer rules form much larger blue blobs than
        // a filled answer bubble; excluding them keeps row calibration stable.
        component.area <= 400,
      ),
    imageData.height,
  );
  if (components.length < Math.ceil(answerKeyLength * 0.7)) return [] as BubbleAnswerDetection[];

  const groups = groupInkComponentsByColumn(components, layout.columnCount);
  const answers: BubbleAnswerDetection[] = [];
  for (let questionIndex = 0; questionIndex < answerKeyLength; questionIndex += 1) {
    const columnIndex = Math.floor(questionIndex / layout.rowsPerColumn);
    const rowIndex = questionIndex % layout.rowsPerColumn;
    const column = groups[columnIndex] ?? [];
    const rowGap = getComponentRowGap(column, layout.rowsPerColumn);
    const expectedY = getExpectedComponentRowY(column, rowIndex, layout.rowsPerColumn);
    const mark = column
      .filter((component) => Math.abs(component.y - expectedY) <= rowGap * 0.46)
      .sort((left, right) => Math.abs(left.y - expectedY) - Math.abs(right.y - expectedY))[0];
    const selectedIndex = mark ? getAlternativeIndex(mark, column, alternatives.length) : -1;
    const markedAnswer = selectedIndex >= 0 ? alternatives[selectedIndex] : "";
    answers.push({
      blockTitle: "CARTÃO-RESPOSTA",
      confidence: markedAnswer ? 99 : 24,
      markedAnswers: markedAnswer ? [markedAnswer] : [],
      question: questionIndex + 1,
      scores: alternatives.map((alternative, index) => ({ alternative, score: index === selectedIndex ? 1 : 0 })),
      status: markedAnswer ? "MARKED" : "BLANK",
    });
  }
  const found = answers.filter((answer) => answer.markedAnswers.length).length;
  return found >= Math.ceil(answerKeyLength * 0.8) ? answers : [];
}

function keepLargestInkGrid(components: BlueInkComponent[], imageHeight: number) {
  const ordered = [...components].sort((left, right) => left.y - right.y);
  const groups: BlueInkComponent[][] = [];
  const maxGap = Math.max(90, imageHeight * 0.08);
  for (const component of ordered) {
    const current = groups.at(-1);
    if (!current || component.y - (current.at(-1)?.y ?? component.y) > maxGap) {
      groups.push([component]);
    } else {
      current.push(component);
    }
  }
  return groups.sort((left, right) => right.length - left.length)[0] ?? [];
}

function detectBlueInkComponents(imageData: ImageData) {
  const { data, height, width } = imageData;
  const visited = new Uint8Array(width * height);
  const components: BlueInkComponent[] = [];
  const step = 2;
  const isBlue = (x: number, y: number) => {
    const index = (y * width + x) * 4;
    return data[index + 2] > data[index] + 12 && data[index + 2] > data[index + 1] + 12 && data[index + 2] > 60;
  };
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const start = y * width + x;
      if (visited[start] || !isBlue(x, y)) continue;
      const queue: Array<[number, number]> = [[x, y]];
      visited[start] = 1;
      let area = 0;
      let sumX = 0;
      let sumY = 0;
      while (queue.length) {
        const [currentX, currentY] = queue.pop()!;
        area += 1;
        sumX += currentX;
        sumY += currentY;
        for (const [nextX, nextY] of [[currentX - step, currentY], [currentX + step, currentY], [currentX, currentY - step], [currentX, currentY + step]]) {
          if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
          const next = nextY * width + nextX;
          if (!visited[next] && isBlue(nextX, nextY)) {
            visited[next] = 1;
            queue.push([nextX, nextY]);
          }
        }
      }
      if (area >= 50) components.push({ area, x: sumX / area, y: sumY / area });
    }
  }
  return components;
}

function groupInkComponentsByColumn(components: BlueInkComponent[], columnCount: number) {
  const usable = [...components].sort((left, right) => left.x - right.x);
  const min = usable[0]?.x ?? 0;
  const max = usable.at(-1)?.x ?? min;
  let centers = Array.from({ length: columnCount }, (_, index) => min + ((max - min) * (index + 0.5)) / columnCount);
  for (let iteration = 0; iteration < 6; iteration += 1) {
    const groups = Array.from({ length: columnCount }, () => [] as BlueInkComponent[]);
    for (const component of usable) {
      const nearest = centers.reduce((best, center, index) => Math.abs(component.x - center) < Math.abs(component.x - centers[best]) ? index : best, 0);
      groups[nearest].push(component);
    }
    centers = groups.map((group, index) => group.length ? average(group.map((component) => component.x)) : centers[index]);
  }
  const groups = Array.from({ length: columnCount }, () => [] as BlueInkComponent[]);
  for (const component of usable) {
    const nearest = centers.reduce((best, center, index) => Math.abs(component.x - center) < Math.abs(component.x - centers[best]) ? index : best, 0);
    groups[nearest].push(component);
  }
  return groups;
}

function getComponentRowGap(column: BlueInkComponent[], rows: number) {
  const ys = [...column].map((component) => component.y).sort((left, right) => left - right);
  return Math.max(10, ((ys.at(-1) ?? 0) - (ys[0] ?? 0)) / Math.max(1, rows - 1));
}

function getExpectedComponentRowY(column: BlueInkComponent[], row: number, rows: number) {
  const ys = [...column].map((component) => component.y).sort((left, right) => left - right);
  const first = ys[0] ?? 0;
  const last = ys.at(-1) ?? first;
  return first + ((last - first) * row) / Math.max(1, rows - 1);
}

function getAlternativeIndex(mark: BlueInkComponent, column: BlueInkComponent[], alternativeCount: number) {
  const min = Math.min(...column.map((component) => component.x));
  const max = Math.max(...column.map((component) => component.x));
  return clamp(Math.round(((mark.x - min) / Math.max(1, max - min)) * (alternativeCount - 1)), 0, alternativeCount - 1);
}

function readProvaScanCardAnswers(params: {
  alternatives: string[];
  answerKeyLength: number;
  getBounds: (questionIndex: number) => Array<{ alternative: string; cx: number; cy: number; radius: number }>;
  imageData: ImageData;
}) {
  const { answerKeyLength, getBounds, imageData } = params;
  return Array.from({ length: answerKeyLength }, (_, questionIndex) => {
    const scores = getBounds(questionIndex).map((bound) => ({
      alternative: bound.alternative,
      score: getBubbleSignal(imageData, bound.cx, bound.cy, bound.radius),
    }));
    const decision = classifyBubbleRow(scores);
    return {
      blockTitle: "CARTÃO-RESPOSTA",
      confidence: decision.confidence,
      markedAnswers: decision.markedAnswers,
      question: questionIndex + 1,
      scores,
      status: decision.status,
    } satisfies BubbleAnswerDetection;
  });
}

function getCompactPrintBubbleBounds(params: {
  alternatives: string[];
  canvasHeight: number;
  canvasWidth: number;
  questionCount: number;
  questionIndex: number;
}) {
  const { alternatives, canvasHeight, canvasWidth, questionCount, questionIndex } = params;
  const startX = canvasWidth * 0.352;
  const endX = canvasWidth * 0.775;
  const answerBoxTop = 64.7 / 297;
  const verticalPadding = 16 / 297;
  const contentHeight = 140 / 297;
  const rowGap = canvasHeight * Math.min(12.5 / 297, contentHeight / Math.max(questionCount, 1));
  const usedHeight = (rowGap / canvasHeight) * questionCount;
  const startY = canvasHeight * (answerBoxTop + verticalPadding + (contentHeight - usedHeight) / 2) + rowGap / 2;
  const radius = Math.max(8, Math.min(canvasWidth, canvasHeight) * 0.021);

  return alternatives.map((alternative, alternativeIndex) => ({
    alternative,
    cx: startX + ((endX - startX) * alternativeIndex) / Math.max(alternatives.length - 1, 1),
    cy: startY + rowGap * questionIndex,
    radius,
  }));
}

function scoreProvaScanCardAnswers(answers: BubbleAnswerDetection[]) {
  return answers.reduce((total, answer) => {
    const ordered = [...answer.scores].sort((left, right) => right.score - left.score);
    const strongest = ordered[0]?.score ?? 0;
    const median = ordered[Math.floor(ordered.length / 2)]?.score ?? 0;
    return total + Math.max(0, strongest - median) * 100 + (strongest >= 0.28 ? 4 : 0);
  }, 0);
}

function isProvaScanCard(templateId?: string) {
  return normalizeTemplateToken(templateId ?? "").startsWith("pscard");
}

function isExternalSchoolAnswerSheet(headerText: string) {
  const normalized = normalizeText(headerText);
  return ["humanas", "exatas", "tecnico"].some((marker) => normalized.includes(marker));
}

export function resolveIdentityFromQr(params: {
  dataExam: Exam;
  dataStudents: Student[];
  preferredStudentId: string;
  qrResult: QrScanResult;
}) {
  const { dataExam, dataStudents, preferredStudentId, qrResult } = params;
  if (qrResult.status !== "success") {
    return null;
  }

  const student = dataStudents.find((item) => item.id === qrResult.payload.alunoId);
  if (!student) {
    return {
      confidence: 0,
      detectedName: "",
      invalidMessage: "QR Code lido, mas o aluno nao existe mais na base local.",
      method: "qr" as const,
      matchedStudentId: "",
    };
  }

  const expectedCorrectionCode = buildIdentificationCode(dataExam, student);
  if (
    qrResult.payload.provaId !== dataExam.id ||
    qrResult.payload.turma !== student.turma ||
    qrResult.payload.correctionCode !== expectedCorrectionCode
  ) {
    return {
      confidence: 0,
      detectedName: student.nome,
      invalidMessage: "QR Code invalido para esta prova, turma ou cartao-resposta.",
      method: "qr" as const,
      matchedStudentId: student.id,
    };
  }

  return {
    confidence: 99,
    detectedName: student.nome,
    invalidMessage: "",
    method: "qr" as const,
    matchedStudentId:
      dataStudents.find((item) => item.id === qrResult.payload.alunoId)?.id ??
      preferredStudentId,
  };
}

function selectAnswerSheetModel(params: {
  answerKeyLength?: number;
  expectedTemplateId?: string;
  headerText: string;
}) {
  const { answerKeyLength, expectedTemplateId, headerText } = params;
  const expectedModel = findAnswerSheetModelById(expectedTemplateId);
  const normalizedHeader = normalizeText(headerText);

  if (expectedModel) {
    const expectedScore = Math.min(
      99,
      72 + scoreModelAgainstHeader(expectedModel, normalizedHeader) + scoreModelAgainstQuestionCount(expectedModel, answerKeyLength),
    );

    return {
      model: expectedModel,
      score: expectedScore,
      usedExpectedTemplate: true,
    };
  }

  const ranked = ANSWER_SHEET_MODELS
    .map((model) => ({
      model,
      score:
        scoreModelAgainstHeader(model, normalizedHeader) +
        scoreModelAgainstQuestionCount(model, answerKeyLength),
    }))
    .sort((left, right) => right.score - left.score);

  return {
    model: ranked[0]?.model ?? ANSWER_SHEET_MODELS[0],
    score: clamp(Math.round(ranked[0]?.score ?? 40), 24, 94),
    usedExpectedTemplate: false,
  };
}

function scoreModelAgainstHeader(model: AnswerSheetModel, normalizedHeader: string) {
  if (!normalizedHeader) {
    return 0;
  }

  let score = 0;

  for (const token of model.tokens) {
    if (normalizedHeader.includes(normalizeTemplateToken(token))) {
      score += 14;
    }
  }

  for (const alias of [model.displayName, model.id, ...model.aliases]) {
    const normalizedAlias = normalizeTemplateToken(alias);
    if (normalizedAlias && normalizedHeader.includes(normalizedAlias)) {
      score += 20;
    }
  }

  return score;
}

function scoreModelAgainstQuestionCount(model: AnswerSheetModel, answerKeyLength?: number) {
  if (!answerKeyLength) {
    return 0;
  }

  const totalQuestions = getAnswerSheetQuestionCount(model);
  if (totalQuestions === answerKeyLength) {
    return 26;
  }

  const difference = Math.abs(totalQuestions - answerKeyLength);
  return Math.max(0, 10 - difference);
}

function readBlockAnswers(params: {
  alternatives: string[];
  block: AnswerSheetBlockModel;
  imageData: ImageData;
  layoutStyle: BlockLayoutStyle;
  questionStart: number;
  rect: RectPixels;
}) {
  const { alternatives, block, imageData, layoutStyle, questionStart, rect } = params;
  const layout = getBlockLayoutMetrics(layoutStyle);
  const rows: BubbleAnswerDetection[] = [];
  const questionAreaTop = rect.y + rect.height * layout.contentTop;
  const questionAreaBottom = rect.y + rect.height * layout.contentBottom;
  const bubbleRadius = Math.max(8, Math.min(rect.width, rect.height) * layout.radiusFactor);
  const rowStep = (questionAreaBottom - questionAreaTop) / Math.max(block.questionCount, 1);
  const bubbleStart = rect.x + rect.width * layout.bubbleStart;
  const bubbleEnd = rect.x + rect.width * layout.bubbleEnd;
  const bubbleGap = (bubbleEnd - bubbleStart) / Math.max(alternatives.length - 1, 1);

  for (let index = 0; index < block.questionCount; index += 1) {
    const cy = questionAreaTop + rowStep * index + rowStep * 0.5;
    const scores = alternatives.map((alternative, alternativeIndex) => ({
      alternative,
      score: getBubbleSignal(
        imageData,
        bubbleStart + bubbleGap * alternativeIndex,
        cy,
        bubbleRadius,
      ),
    }));
    const decision = classifyBubbleRow(scores);
    rows.push({
      blockTitle: block.title,
      confidence: decision.confidence,
      markedAnswers: decision.markedAnswers,
      question: questionStart + index,
      scores,
      status: decision.status,
    });
  }

  return rows;
}

export function classifyBubbleRow(scores: AnswerBubbleScore[]) {
  const ordered = [...scores].sort((left, right) => right.score - left.score);
  const strongest = ordered[0]?.score ?? 0;
  const second = ordered[1]?.score ?? 0;
  const weakest = ordered.at(-1)?.score ?? 0;
  const background = ordered[Math.min(ordered.length - 1, Math.max(1, Math.floor(ordered.length * 0.75)))]?.score ?? weakest;
  const clearSignal = strongest >= 0.16 && strongest - background >= 0.035;
  // Uma segunda bolha preenchida à mão pode ficar sensivelmente mais clara do
  // que a primeira. Compare cada candidata com o ruído da própria linha, não
  // apenas com uma diferença fixa em relação à marca mais escura.
  const multipleThreshold = Math.max(0.22, background + Math.max(0.08, (strongest - background) * 0.30));
  const multipleAnswers = ordered
    .filter((item) => item.score >= multipleThreshold)
    .map((item) => item.alternative);
  const confidence = clamp(
    Math.round(34 + (strongest - second) * 300 + (strongest - weakest) * 180),
    24,
    99,
  );

  if (!clearSignal) {
    return {
      confidence,
      markedAnswers: [],
      status: "BLANK" as const,
    };
  }

  if (multipleAnswers.length > 1) {
    return {
      confidence,
      markedAnswers: multipleAnswers,
      status: "MULTIPLE" as const,
    };
  }

  if (strongest - second < 0.03) {
    return {
      confidence,
      markedAnswers: [ordered[0]?.alternative].filter(Boolean),
      status: "LOW_CONFIDENCE" as const,
    };
  }

  return {
    confidence,
    markedAnswers: [ordered[0]?.alternative].filter(Boolean),
    status: "MARKED" as const,
  };
}

function fitRectToBorder(imageData: ImageData, searchWindow: NormalizedRect) {
  const approx = normalizedRectToPixels(searchWindow, imageData.width, imageData.height);
  const left = refineVerticalEdge(imageData, approx, "left");
  const right = refineVerticalEdge(imageData, approx, "right");
  const top = refineHorizontalEdge(imageData, approx, "top");
  const bottom = refineHorizontalEdge(imageData, approx, "bottom");

  if (right - left < approx.width * 0.55 || bottom - top < approx.height * 0.55) {
    return approx;
  }

  return {
    height: bottom - top,
    width: right - left,
    x: left,
    y: top,
  };
}

function refineVerticalEdge(imageData: ImageData, rect: RectPixels, edge: "left" | "right") {
  const radius = Math.max(12, Math.round(rect.width * 0.08));
  const target = edge === "left" ? rect.x : rect.x + rect.width;
  const start = clamp(Math.round(target - radius), 0, imageData.width - 1);
  const end = clamp(Math.round(target + radius), 0, imageData.width - 1);
  let bestScore = -1;
  let bestX = clamp(Math.round(target), 0, imageData.width - 1);

  for (let x = start; x <= end; x += 1) {
    let darkPixels = 0;
    let total = 0;

    for (
      let y = clamp(rect.y - Math.round(rect.height * 0.04), 0, imageData.height - 1);
      y <= clamp(rect.y + rect.height + Math.round(rect.height * 0.04), 0, imageData.height - 1);
      y += 1
    ) {
      const index = (y * imageData.width + x) * 4;
      if (imageData.data[index] < DARK_PIXEL_THRESHOLD) {
        darkPixels += 1;
      }
      total += 1;
    }

    const score = total ? darkPixels / total : 0;
    if (score > bestScore) {
      bestScore = score;
      bestX = x;
    }
  }

  return bestX;
}

function refineHorizontalEdge(imageData: ImageData, rect: RectPixels, edge: "bottom" | "top") {
  const radius = Math.max(12, Math.round(rect.height * 0.08));
  const target = edge === "top" ? rect.y : rect.y + rect.height;
  const start = clamp(Math.round(target - radius), 0, imageData.height - 1);
  const end = clamp(Math.round(target + radius), 0, imageData.height - 1);
  let bestScore = -1;
  let bestY = clamp(Math.round(target), 0, imageData.height - 1);

  for (let y = start; y <= end; y += 1) {
    let darkPixels = 0;
    let total = 0;

    for (
      let x = clamp(rect.x - Math.round(rect.width * 0.04), 0, imageData.width - 1);
      x <= clamp(rect.x + rect.width + Math.round(rect.width * 0.04), 0, imageData.width - 1);
      x += 1
    ) {
      const index = (y * imageData.width + x) * 4;
      if (imageData.data[index] < DARK_PIXEL_THRESHOLD) {
        darkPixels += 1;
      }
      total += 1;
    }

    const score = total ? darkPixels / total : 0;
    if (score > bestScore) {
      bestScore = score;
      bestY = y;
    }
  }

  return bestY;
}

function normalizedRectToPixels(rect: NormalizedRect, width: number, height: number): RectPixels {
  return {
    height: Math.round(rect.height * height),
    width: Math.round(rect.width * width),
    x: Math.round(rect.x * width),
    y: Math.round(rect.y * height),
  };
}

function getBlockLayoutMetrics(layoutStyle: BlockLayoutStyle): LayoutMetrics {
  if (layoutStyle === "classic") {
    return {
      bubbleEnd: 0.86,
      bubbleStart: 0.27,
      contentBottom: 0.93,
      contentTop: 0.18,
      radiusFactor: 0.036,
    };
  }

  return {
    bubbleEnd: 0.87,
    bubbleStart: 0.31,
    contentBottom: 0.92,
    contentTop: 0.20,
    radiusFactor: 0.034,
  };
}

function buildQrScanCandidates(canvas: HTMLCanvasElement) {
  const candidates = [canvas];
  const qrZone = cropCanvas(canvas, {
    height: Math.round(canvas.height * 0.26),
    width: Math.round(canvas.width * 0.28),
    x: Math.round(canvas.width * 0.66),
    y: Math.round(canvas.height * 0.05),
  });
  candidates.push(scaleCanvas(qrZone, 2));
  candidates.push(scaleCanvas(canvas, 1.35));
  return candidates;
}

function cropCanvas(
  source: HTMLCanvasElement,
  crop: { height: number; width: number; x: number; y: number },
) {
  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return source;
  }

  context.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return canvas;
}

function scaleCanvas(source: HTMLCanvasElement, factor: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(source.width * factor);
  canvas.height = Math.round(source.height * factor);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return source;
  }

  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function getBubbleSignal(imageData: ImageData, cx: number, cy: number, radius: number) {
  let innerDark = 0;
  let innerTotal = 0;
  let ringDark = 0;
  let ringTotal = 0;
  const left = Math.max(0, Math.floor(cx - radius));
  const top = Math.max(0, Math.floor(cy - radius));
  const right = Math.min(imageData.width - 1, Math.ceil(cx + radius));
  const bottom = Math.min(imageData.height - 1, Math.ceil(cy + radius));
  const innerRadius = radius * 0.54;
  const outerRadius = radius * 0.78;
  const darkThreshold = getLocalDarkThreshold(imageData, cx, cy, radius);

  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > outerRadius) {
        continue;
      }

      const index = (y * imageData.width + x) * 4;
      const isDark = pixelLuminance(imageData.data, index) < darkThreshold;

      if (distance <= innerRadius) {
        innerDark += isDark ? 1 : 0;
        innerTotal += 1;
      } else {
        ringDark += isDark ? 1 : 0;
        ringTotal += 1;
      }
    }
  }

  const innerRatio = innerTotal ? innerDark / innerTotal : 0;
  const ringRatio = ringTotal ? ringDark / ringTotal : 0;
  return innerRatio * 0.78 + ringRatio * 0.22;
}

function getLocalDarkThreshold(imageData: ImageData, cx: number, cy: number, radius: number) {
  const samples: number[] = [];
  const innerRadius = radius * 1.06;
  const outerRadius = radius * 1.42;

  for (let y = Math.floor(cy - outerRadius); y <= Math.ceil(cy + outerRadius); y += 2) {
    for (let x = Math.floor(cx - outerRadius); x <= Math.ceil(cx + outerRadius); x += 2) {
      const distance = Math.hypot(x - cx, y - cy);
      if (distance < innerRadius || distance > outerRadius || x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) continue;
      samples.push(pixelLuminance(imageData.data, (y * imageData.width + x) * 4));
    }
  }

  samples.sort((left, right) => left - right);
  const reference = samples[Math.floor(samples.length * 0.7)] ?? DARK_PIXEL_THRESHOLD;
  return reference < DARK_PIXEL_THRESHOLD + 8
    ? clamp(reference - 26, 42, DARK_PIXEL_THRESHOLD)
    : DARK_PIXEL_THRESHOLD;
}

function pixelLuminance(data: Uint8ClampedArray, index: number) {
  return data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
