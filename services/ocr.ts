import { createWorker } from "tesseract.js";

export type OcrDetection = {
  nomeOuMatricula: string;
  confianca: number;
  origem: "ocr" | "manual";
};

export async function extractIdentityFromImage(imageUrl: string): Promise<OcrDetection> {
  if (!process.env.ENABLE_TESSERACT_OCR) {
    return {
      nomeOuMatricula: "Ana Beatriz Rocha",
      confianca: 94,
      origem: "manual",
    };
  }

  const worker = await createWorker("por");

  try {
    const result = await worker.recognize(imageUrl);
    return {
      nomeOuMatricula: result.data.text.trim().split("\n")[0] ?? "",
      confianca: Math.round(result.data.confidence),
      origem: "ocr",
    };
  } finally {
    await worker.terminate();
  }
}
