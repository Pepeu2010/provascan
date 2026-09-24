import { classifyUniversalMarks } from "@/services/universal-exam-core";
import { rectifyMobilePhoto } from "@/services/mobile-photo-rectification";
import { detectOfficialAnswerGrid } from "@/services/official-answer-grid";

export type BubbleCandidate = {
  fillScore: number;
  height: number;
  width: number;
  x: number;
  y: number;
};

export type UniversalBubbleRow = {
  bubbles: BubbleCandidate[];
  marks: ReturnType<typeof classifyUniversalMarks>;
  question: number;
};

export type UniversalLayoutResult = {
  alternativeCount: number;
  columnCount: number;
  confidence: number;
  rows: UniversalBubbleRow[];
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
};

export function groupBubbleCandidates(candidates: BubbleCandidate[]): UniversalLayoutResult {
  if (!candidates.length) return { alternativeCount: 0, columnCount: 0, confidence: 0, rows: [] };
  const sizeHistogram = new Map<number, number>();
  for (const candidate of candidates) {
    const bucket = Math.max(4, Math.round(Math.max(candidate.width, candidate.height) / 4) * 4);
    sizeHistogram.set(bucket, (sizeHistogram.get(bucket) ?? 0) + 1);
  }
  // Bubble grids repeat medium-size circles; weighting frequency by physical
  // size keeps dense OCR glyphs from becoming the dominant component family.
  const dominantSize = [...sizeHistogram].sort((left, right) => right[0] * right[1] - left[0] * left[1] || right[0] - left[0])[0][0];
  const likelyBubbles = candidates.filter((candidate) => {
    const size = Math.max(candidate.width, candidate.height);
    return size >= dominantSize * 0.72 && size <= dominantSize * 1.35;
  });
  const typicalHeight = median(likelyBubbles.map((item) => item.height));
  const horizontalBands: BubbleCandidate[][] = [];
  for (const candidate of [...likelyBubbles].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const band = horizontalBands.find((items) => Math.abs(median(items.map((item) => item.y)) - candidate.y) <= typicalHeight * 0.75);
    if (band) band.push(candidate);
    else horizontalBands.push([candidate]);
  }

  const rowGroups: BubbleCandidate[][] = [];
  for (const band of horizontalBands) {
    const ordered = band.sort((a, b) => a.x - b.x);
    const gaps = ordered.slice(1).map((item, index) => item.x - ordered[index].x).filter((gap) => gap > 0);
    const typicalGap = median(gaps.filter((gap) => gap <= median(gaps) * 1.8)) || typicalHeight * 1.5;
    let current: BubbleCandidate[] = [];
    for (const bubble of ordered) {
      if (current.length && bubble.x - current.at(-1)!.x > Math.max(typicalGap * 2.2, typicalHeight * 3)) {
        if (current.length >= 2 && current.length <= 10) rowGroups.push(current);
        current = [];
      }
      current.push(bubble);
    }
    if (current.length >= 2 && current.length <= 10) rowGroups.push(current);
  }

  if (!rowGroups.length) return { alternativeCount: 0, columnCount: 0, confidence: 0, rows: [] };
  const counts = new Map<number, number>();
  for (const row of rowGroups) counts.set(row.length, (counts.get(row.length) ?? 0) + 1);
  const alternativeCount = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
  const consistentRows = rowGroups.filter((row) => row.length === alternativeCount);
  const rowWidth = median(consistentRows.map((row) => row.at(-1)!.x - row[0].x));
  const rowDescriptors = consistentRows.map((bubbles) => ({
    bubbles,
    centerX: (bubbles[0].x + bubbles.at(-1)!.x) / 2,
    centerY: median(bubbles.map((item) => item.y)),
  }));
  const columns: typeof rowDescriptors[] = [];
  for (const row of [...rowDescriptors].sort((a, b) => a.centerX - b.centerX)) {
    const column = columns.find((items) => Math.abs(median(items.map((item) => item.centerX)) - row.centerX) <= Math.max(rowWidth * 0.5, typicalHeight * 2));
    if (column) column.push(row);
    else columns.push([row]);
  }
  const orderedRows = columns
    .sort((a, b) => median(a.map((item) => item.centerX)) - median(b.map((item) => item.centerX)))
    .flatMap((column) => column.sort((a, b) => a.centerY - b.centerY));

  return {
    alternativeCount,
    columnCount: columns.length,
    confidence: Math.round((consistentRows.length / Math.max(rowGroups.length, 1)) * 100) / 100,
    rows: orderedRows.map((row, index) => ({
      bubbles: row.bubbles,
      marks: classifyUniversalMarks(row.bubbles.map((bubble) => bubble.fillScore)),
      question: index + 1,
    })),
  };
}

export function detectBubbleCandidates(imageData: ImageData): BubbleCandidate[] {
  const { data, height, width } = imageData;
  const visited = new Uint8Array(width * height);
  const darkMap = new Uint8Array(width * height);
  const connectedMap = new Uint8Array(width * height);
  const candidates: BubbleCandidate[] = [];
  const minSize = Math.max(6, Math.round(Math.min(width, height) / 180));
  const maxSize = Math.max(42, Math.round(Math.min(width, height) / 12));
  const isDark = (pixel: number) => {
    const offset = pixel * 4;
    return data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722 < 165;
  };

  for (let pixel = 0; pixel < darkMap.length; pixel += 1) darkMap[pixel] = isDark(pixel) ? 1 : 0;
  // Phone resampling often breaks a printed circle into one-pixel arcs. A
  // one-pixel closing reconnects those arcs without bridging neighboring
  // alternatives, which are separated by much larger gaps.
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const pixel = y * width + x;
      if (
        darkMap[pixel] || darkMap[pixel - 1] || darkMap[pixel + 1]
        || darkMap[pixel - width] || darkMap[pixel + width]
        || darkMap[pixel - width - 1] || darkMap[pixel - width + 1]
        || darkMap[pixel + width - 1] || darkMap[pixel + width + 1]
      ) connectedMap[pixel] = 1;
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (visited[start] || !connectedMap[start]) continue;
      const queue = [start];
      visited[start] = 1;
      let cursor = 0;
      let minX = x; let maxX = x; let minY = y; let maxY = y; let area = 0;
      while (cursor < queue.length && area <= maxSize * maxSize) {
        const pixel = queue[cursor++];
        const px = pixel % width;
        const py = Math.floor(pixel / width);
        area += 1;
        minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py);
        for (const neighbor of [pixel - 1, pixel + 1, pixel - width, pixel + width]) {
          if (neighbor < 0 || neighbor >= visited.length || visited[neighbor] || !connectedMap[neighbor]) continue;
          const nx = neighbor % width;
          if (Math.abs(nx - px) > 1) continue;
          visited[neighbor] = 1;
          queue.push(neighbor);
        }
      }
      const boxWidth = maxX - minX + 1;
      const boxHeight = maxY - minY + 1;
      const aspect = boxWidth / Math.max(boxHeight, 1);
      const density = area / Math.max(boxWidth * boxHeight, 1);
      if (boxWidth < minSize || boxHeight < minSize || boxWidth > maxSize || boxHeight > maxSize || aspect < 0.8 || aspect > 1.25 || density < 0.08) continue;
      let innerDark = 0; let innerTotal = 0;
      const centerX = (minX + maxX) / 2; const centerY = (minY + maxY) / 2;
      for (let sy = minY; sy <= maxY; sy += 1) {
        for (let sx = minX; sx <= maxX; sx += 1) {
          const dx = (sx - centerX) / Math.max(boxWidth * 0.32, 1);
          const dy = (sy - centerY) / Math.max(boxHeight * 0.32, 1);
          if (dx * dx + dy * dy > 1) continue;
          innerTotal += 1;
          if (darkMap[sy * width + sx]) innerDark += 1;
        }
      }
      candidates.push({ fillScore: innerDark / Math.max(innerTotal, 1), height: boxHeight, width: boxWidth, x: centerX, y: centerY });
    }
  }
  return candidates;
}

export function analyzeUniversalAnswerSheet(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Não foi possível analisar esta página.");
  const result = groupBubbleCandidates(detectBubbleCandidates(context.getImageData(0, 0, canvas.width, canvas.height)));
  if (result.rows.length < 1) {
    throw new Error("Não conseguimos identificar linhas de alternativas nesta página. Ajuste a estrutura manualmente ou envie outra imagem.");
  }
  return result;
}

export function analyzeUniversalPage(source: HTMLCanvasElement) {
  const upright = source.width > source.height ? rotateCanvas(source) : source;
  const candidates: Array<{ canvas: HTMLCanvasElement; layout: UniversalLayoutResult; perspectiveCorrected: boolean }> = [];
  const uprightContext = upright.getContext("2d", { willReadFrequently: true });
  if (uprightContext) {
    const official = detectOfficialAnswerGrid(uprightContext.getImageData(0, 0, upright.width, upright.height));
    if (official) candidates.push({ canvas: upright, layout: official, perspectiveCorrected: false });
  }
  try {
    candidates.push({ canvas: upright, layout: analyzeUniversalAnswerSheet(upright), perspectiveCorrected: false });
  } catch {
    // The rectified candidate below may still recover a photographed page.
  }
  const rectified = rectifyMobilePhoto(upright, 794 / 1123);
  if (rectified.applied) {
    try {
      candidates.push({ canvas: rectified.canvas, layout: analyzeUniversalAnswerSheet(rectified.canvas), perspectiveCorrected: true });
    } catch {
      // Keep the unrectified candidate when projective correction hurts detail.
    }
  }
  const best = candidates.sort((left, right) => {
    const rowDelta = right.layout.rows.length - left.layout.rows.length;
    return rowDelta || right.layout.confidence - left.layout.confidence;
  })[0];
  if (!best) throw new Error("Não conseguimos identificar linhas de alternativas nesta página. Ajuste a estrutura manualmente ou envie outra imagem.");
  return best;
}

function rotateCanvas(source: HTMLCanvasElement) {
  const canvas = document.createElement("canvas");
  canvas.width = source.height;
  canvas.height = source.width;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return source;
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(Math.PI / 2);
  context.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}
