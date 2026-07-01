import { getBubbleBounds } from "@/services/answer-sheet-template";
import { extractIdentityFromImage } from "@/services/ocr";
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

export type BubbleAnswerDetection = {
  confidence: number;
  markedAnswers: string[];
  question: number;
};

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

export function detectAnswersFromCanvas(params: {
  alternatives: string[];
  canvas: HTMLCanvasElement;
  correctAnswers: Array<{ correctAnswer: string; question: number }>;
}) {
  const { alternatives, canvas, correctAnswers } = params;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Nao foi possivel analisar as marcacoes da imagem.");
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const outputs: BubbleAnswerDetection[] = [];

  for (let index = 0; index < correctAnswers.length; index += 1) {
    const answer = correctAnswers[index];
    const bubbles = getBubbleBounds({
      alternatives,
      canvasHeight: canvas.height,
      canvasWidth: canvas.width,
      questionCount: correctAnswers.length,
      questionIndex: index,
    });
    const signals = bubbles.map((bubble) => getBubbleSignal(imageData, bubble.cx, bubble.cy, bubble.radius));
    const strongest = Math.max(...signals);
    const weakest = Math.min(...signals);
    const markedAnswers = bubbles
      .filter((bubble, signalIndex) => strongest > 0.18 && signals[signalIndex] >= strongest * 0.78)
      .map((bubble) => bubble.alternative);
    const confidence = Math.round(Math.min(98, Math.max(28, 40 + (strongest - weakest) * 180)));

    outputs.push({
      confidence,
      markedAnswers,
      question: answer.question,
    });
  }

  return outputs;
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
  let dark = 0;
  let total = 0;
  const left = Math.max(0, Math.floor(cx - radius));
  const top = Math.max(0, Math.floor(cy - radius));
  const right = Math.min(imageData.width - 1, Math.ceil(cx + radius));
  const bottom = Math.min(imageData.height - 1, Math.ceil(cy + radius));
  const innerRadius = radius * 0.72;

  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > innerRadius) {
        continue;
      }

      const index = (y * imageData.width + x) * 4;
      const value = imageData.data[index];
      if (value < 138) {
        dark += 1;
      }
      total += 1;
    }
  }

  return total ? dark / total : 0;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
