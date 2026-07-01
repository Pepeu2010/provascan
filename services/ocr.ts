export type OcrDetection = {
  confianca: number;
  nomeOuMatricula: string;
  origem: "ocr" | "manual";
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

export async function extractIdentityFromImage(imageUrl: string): Promise<OcrDetection> {
  const worker = await getWorker();

  try {
    const result = await worker.recognize(imageUrl);
    const rawText = result.data.text.trim();
    const lines = rawText.split("\n").map((line) => line.trim()).filter(Boolean);
    const registrationLine = lines.find((line) => /\b\d{5,}\b/.test(line)) ?? "";
    const firstTextLine = lines.find((line) => /[A-Za-zÀ-ÿ]{3,}/.test(line)) ?? "";
    const normalized = registrationLine || firstTextLine || rawText.slice(0, 120);

    return {
      confianca: Math.round(result.data.confidence),
      nomeOuMatricula: normalized,
      origem: "ocr",
      rawText,
    };
  } catch {
    return {
      confianca: 0,
      nomeOuMatricula: "",
      origem: "manual",
      rawText: "",
    };
  }
}
