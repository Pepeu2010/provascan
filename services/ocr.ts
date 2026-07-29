export type OcrDetection = {
  confianca: number;
  nomeDetectado: string;
  origem: "ocr" | "manual";
  rawText: string;
};

export type OcrTextResult = {
  confidence: number;
  rawText: string;
};

let workerPromise: Promise<import("tesseract.js").Worker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      return createWorker("por");
    })();
  }

  return workerPromise;
}

export async function extractTextFromImage(imageUrl: string): Promise<OcrTextResult> {
  const worker = await getWorker();
  const result = await worker.recognize(imageUrl);

  return {
    confidence: result.data.confidence,
    rawText: result.data.text.trim(),
  };
}

export async function extractIdentityFromImage(imageUrl: string): Promise<OcrDetection> {
  try {
    const result = await extractTextFromImage(imageUrl);
    const rawText = result.rawText;
    const lines = rawText.split("\n").map((line) => line.trim()).filter(Boolean);
    const firstTextLine = lines.find((line) => /[A-Za-zÀ-ÿ]{3,}/.test(line)) ?? "";
    const normalized = firstTextLine || rawText.slice(0, 120);

    return {
      confianca: Math.round(result.confidence),
      nomeDetectado: normalized,
      origem: "ocr",
      rawText,
    };
  } catch {
    return {
      confianca: 0,
      nomeDetectado: "",
      origem: "manual",
      rawText: "",
    };
  }
}
