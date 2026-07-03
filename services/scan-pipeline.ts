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
import { extractIdentityFromImage, extractTextFromImage } from "@/services/ocr";
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
  detectedRegistration: string;
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
  const { canvas, preferredStudentId, students } = params;
  const headerCanvas = cropCanvas(canvas, {
    height: Math.round(canvas.height * 0.24),
    width: Math.round(canvas.width * 0.78),
    x: Math.round(canvas.width * 0.08),
    y: Math.round(canvas.height * 0.08),
  });
  const result = await extractIdentityFromImage(headerCanvas.toDataURL("image/jpeg", 0.92));
  const normalized = normalizeText(result.rawText || result.nomeOuMatricula);
  const byRegistration = students.find((student) => normalized.includes(normalizeText(student.matricula)));
  const byName = students.find((student) => {
    const tokens = student.nome.split(" ").map((token) => normalizeText(token)).filter((token) => token.length >= 3);
    return tokens.some((token) => normalized.includes(token));
  });
  const fallback =
    byRegistration ??
    byName ??
    students.find((student) => student.id === preferredStudentId) ??
    students[0];

  return {
    confidence: result.confianca,
    detectedName: byName?.nome ?? fallback?.nome ?? "",
    detectedRegistration: byRegistration?.matricula ?? fallback?.matricula ?? "",
    rawText: result.rawText,
    status: fallback ? "matched" : "not-found",
    studentId: fallback?.id ?? "",
  } satisfies OcrFallbackResult;
}

export async function analyzeAnswerSheetCanvas(params: {
  answerKeyLength?: number;
  canvas: HTMLCanvasElement;
  expectedTemplateId?: string;
}) {
  const { answerKeyLength, canvas, expectedTemplateId } = params;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Nao foi possivel analisar as marcacoes da imagem.");
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

  const answers: BubbleAnswerDetection[] = [];
  const blockAudits: AnswerSheetBlockAudit[] = [];
  let questionStart = 1;

  for (const block of selectedModel.model.blocks) {
    const rect = fitRectToBorder(imageData, block.searchWindow);
    const blockAnswers = readBlockAnswers({
      alternatives: ["A", "B", "C", "D", "E"],
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
  answerKeyLength?: number;
  canvas: HTMLCanvasElement;
  expectedTemplateId?: string;
}) {
  const result = await analyzeAnswerSheetCanvas(params);
  return result.answers;
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
      detectedRegistration: "",
      invalidMessage: "QR Code lido, mas o aluno nao existe mais na base local.",
      method: "qr" as const,
      matchedStudentId: "",
    };
  }

  if (qrResult.payload.provaId !== dataExam.id || qrResult.payload.turma !== dataExam.turma) {
    return {
      confidence: 0,
      detectedName: student.nome,
      detectedRegistration: student.matricula,
      invalidMessage: "QR Code valido, mas aponta para outra prova ou turma.",
      method: "qr" as const,
      matchedStudentId: student.id,
    };
  }

  return {
    confidence: 99,
    detectedName: student.nome,
    detectedRegistration: student.matricula,
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

function classifyBubbleRow(scores: AnswerBubbleScore[]) {
  const ordered = [...scores].sort((left, right) => right.score - left.score);
  const strongest = ordered[0]?.score ?? 0;
  const second = ordered[1]?.score ?? 0;
  const weakest = ordered.at(-1)?.score ?? 0;
  const median = ordered[Math.floor(ordered.length / 2)]?.score ?? 0;
  const clearSignal = strongest >= 0.16 && strongest - median >= 0.035;
  const multipleAnswers = ordered
    .filter((item) => item.score >= Math.max(0.17, strongest - 0.035))
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

  if (multipleAnswers.length > 1 && second >= strongest - 0.025) {
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

  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > outerRadius) {
        continue;
      }

      const index = (y * imageData.width + x) * 4;
      const isDark = imageData.data[index] < DARK_PIXEL_THRESHOLD;

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
