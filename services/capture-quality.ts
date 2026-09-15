export type CaptureQualityMetrics = {
  brightnessMean: number;
  clippedDarkRatio: number;
  clippedLightRatio: number;
  edgeInkRatio: number;
  sharpness: number;
};

export type CaptureQualityIssue = {
  advice: string;
  code: "blur" | "bright" | "crop" | "dark";
  label: string;
};

export type CaptureQualityResult = {
  accepted: boolean;
  issues: CaptureQualityIssue[];
  score: number;
};

export function evaluateCaptureQuality(metrics: CaptureQualityMetrics): CaptureQualityResult {
  const issues: CaptureQualityIssue[] = [];
  if (metrics.brightnessMean < 72 || metrics.clippedDarkRatio > 0.18) {
    issues.push({ advice: "Leve a folha para um local com mais luz e evite sua própria sombra.", code: "dark", label: "Foto escura" });
  } else if (metrics.brightnessMean > 225 || metrics.clippedLightRatio > 0.24) {
    issues.push({ advice: "Afaste a luz direta para que os círculos não desapareçam no brilho.", code: "bright", label: "Luz forte demais" });
  }
  if (metrics.sharpness < 80) {
    issues.push({ advice: "Apoie o celular, limpe a lente e fotografe novamente sem movimento.", code: "blur", label: "Foto desfocada" });
  }
  if (metrics.edgeInkRatio > 0.16) {
    issues.push({ advice: "Deixe uma pequena margem ao redor de toda a folha.", code: "crop", label: "Folha muito perto da borda" });
  }
  return { accepted: issues.length === 0, issues, score: Math.max(0, 100 - issues.length * 25) };
}

export function measureCaptureQuality(canvas: HTMLCanvasElement): CaptureQualityResult {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return evaluateCaptureQuality({ brightnessMean: 128, clippedDarkRatio: 0, clippedLightRatio: 0, edgeInkRatio: 0, sharpness: 0 });
  const sampleWidth = Math.min(canvas.width, 480);
  const sampleHeight = Math.max(1, Math.round((canvas.height / Math.max(canvas.width, 1)) * sampleWidth));
  const sample = document.createElement("canvas");
  sample.width = sampleWidth;
  sample.height = sampleHeight;
  const sampleContext = sample.getContext("2d", { willReadFrequently: true });
  if (!sampleContext) return evaluateCaptureQuality({ brightnessMean: 128, clippedDarkRatio: 0, clippedLightRatio: 0, edgeInkRatio: 0, sharpness: 0 });
  sampleContext.drawImage(canvas, 0, 0, sampleWidth, sampleHeight);
  const { data } = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight);
  const gray = new Float32Array(sampleWidth * sampleHeight);
  let sum = 0;
  let dark = 0;
  let light = 0;
  let edgeInk = 0;
  let edgePixels = 0;
  for (let index = 0; index < gray.length; index += 1) {
    const offset = index * 4;
    const value = data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114;
    gray[index] = value;
    sum += value;
    if (value < 28) dark += 1;
    if (value > 247) light += 1;
    const x = index % sampleWidth;
    const y = Math.floor(index / sampleWidth);
    const isEdge = x < sampleWidth * 0.05 || x >= sampleWidth * 0.95 || y < sampleHeight * 0.05 || y >= sampleHeight * 0.95;
    if (isEdge) {
      edgePixels += 1;
      if (value < 110) edgeInk += 1;
    }
  }
  let laplacian = 0;
  let compared = 0;
  for (let y = 1; y < sampleHeight - 1; y += 2) {
    for (let x = 1; x < sampleWidth - 1; x += 2) {
      const center = gray[y * sampleWidth + x];
      laplacian += Math.abs(4 * center - gray[y * sampleWidth + x - 1] - gray[y * sampleWidth + x + 1] - gray[(y - 1) * sampleWidth + x] - gray[(y + 1) * sampleWidth + x]);
      compared += 1;
    }
  }
  return evaluateCaptureQuality({
    brightnessMean: sum / gray.length,
    clippedDarkRatio: dark / gray.length,
    clippedLightRatio: light / gray.length,
    edgeInkRatio: edgeInk / Math.max(edgePixels, 1),
    sharpness: laplacian / Math.max(compared, 1) * 10,
  });
}
