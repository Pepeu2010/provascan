import { getQuestionLayout } from "@/services/answer-sheet-template";
import { classifyUniversalMarks } from "@/services/universal-exam-core";
import type { BubbleCandidate, UniversalBubbleRow } from "@/services/universal-layout-analysis";

type CandidateTrack = {
  center: number;
  items: BubbleCandidate[];
};

export type OfficialAnswerGrid = {
  alternativeCount: number;
  columnCount: number;
  confidence: number;
  rows: UniversalBubbleRow[];
};

export function detectOfficialAnswerGrid(imageData: ImageData, expected?: {
  alternatives: string[];
  questionCount: number;
}): OfficialAnswerGrid | null {
  const candidates = detectPrintedCircles(imageData);
  if (candidates.length < 10) return null;

  const typicalDiameter = getTypicalDiameter(candidates);
  const sizeFiltered = candidates.filter((candidate) => {
    const diameter = Math.max(candidate.width, candidate.height);
    return diameter >= typicalDiameter * 0.68 && diameter <= typicalDiameter * 1.42;
  });
  const xTolerance = Math.max(typicalDiameter * 1.2, Math.min(imageData.width, imageData.height) * 0.014);
  const rawTracks = clusterCandidates(sizeFiltered, "x", xTolerance)
    .map((items) => ({ center: mean(items.map((item) => item.x)), items }))
    .filter((track) => track.items.length >= 4)
    .sort((left, right) => left.center - right.center);
  if (rawTracks.length < 2) return null;

  const columnTracks = expected
    ? selectExpectedTracks(rawTracks, expected.questionCount, expected.alternatives.length)
    : inferColumnTracks(rawTracks);
  if (!columnTracks?.length) return null;

  const alternativeCount = expected?.alternatives.length ?? mode(columnTracks.map((tracks) => tracks.length));
  if (alternativeCount < 2 || columnTracks.some((tracks) => tracks.length !== alternativeCount)) return null;

  const expectedLayout = expected ? getQuestionLayout(expected.questionCount, expected.alternatives) : null;
  const rows: UniversalBubbleRow[] = [];
  let detectedCells = 0;
  let expectedCells = 0;

  for (let columnIndex = 0; columnIndex < columnTracks.length; columnIndex += 1) {
    const tracks = columnTracks[columnIndex];
    const columnCandidates = tracks.flatMap((track) => track.items);
    const bandTolerance = Math.max(3, typicalDiameter * 0.72);
    let bands = clusterCandidates(columnCandidates, "y", bandTolerance)
      .filter((items) => items.length >= Math.ceil(alternativeCount * 0.6))
      .sort((left, right) => mean(left.map((item) => item.y)) - mean(right.map((item) => item.y)));

    const configuredRows = expectedLayout
      ? Math.max(0, Math.min(expectedLayout.rowsPerColumn, expected!.questionCount - columnIndex * expectedLayout.rowsPerColumn))
      : 0;
    bands = configuredRows ? selectRegularBands(bands, configuredRows) : selectLongestRegularBandRun(bands);
    const expectedRows = configuredRows || bands.length;
    if (bands.length !== expectedRows || expectedRows < 1) return null;

    for (const band of bands) {
      const centerY = mean(band.map((item) => item.y));
      const bubbles = tracks.map((track) => {
        const predictedX = predictTrackX(track, centerY);
        const nearest = band
          .filter((candidate) => Math.abs(candidate.x - predictedX) <= xTolerance)
          .sort((left, right) => Math.abs(left.x - predictedX) - Math.abs(right.x - predictedX))[0];
        if (nearest) {
          detectedCells += 1;
          return nearest;
        }
        return {
          fillScore: 0,
          height: typicalDiameter,
          width: typicalDiameter,
          x: predictedX,
          y: centerY,
        };
      });
      expectedCells += alternativeCount;
      rows.push({
        bubbles,
        marks: classifyUniversalMarks(bubbles.map((bubble) => bubble.fillScore)),
        question: rows.length + 1,
      });
    }
  }

  if (expected && rows.length !== expected.questionCount) return null;
  const coverage = detectedCells / Math.max(expectedCells, 1);
  const markedOrBlank = rows.filter((row) => row.marks.status === "marked" || row.marks.status === "blank" || row.marks.status === "multiple_marks").length;
  const confidence = Math.round(Math.min(1, coverage * 0.72 + (markedOrBlank / Math.max(rows.length, 1)) * 0.28) * 100) / 100;
  return confidence >= 0.72
    ? { alternativeCount, columnCount: columnTracks.length, confidence, rows }
    : null;
}

function detectPrintedCircles(imageData: ImageData) {
  const { data, height, width } = imageData;
  const minimumDimension = Math.min(width, height);
  const minimumDiameter = Math.max(7, Math.round(minimumDimension / 145));
  const maximumDiameter = Math.max(34, Math.round(minimumDimension / 17));
  const duplicateDistance = Math.max(3, minimumDimension / 260);
  const candidates: BubbleCandidate[] = [];
  const thresholds = [58, 76, 94, 112, 130, 148];
  const startX = Math.round(width * 0.04);
  const endX = Math.round(width * 0.96);
  const startY = Math.round(height * 0.2);
  const endY = Math.round(height * 0.92);

  for (const threshold of thresholds) {
    const visited = new Uint8Array(width * height);
    const isDark = (pixel: number) => luminance(data, pixel * 4) < threshold;
    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        const start = y * width + x;
        if (visited[start] || !isDark(start)) continue;
        const queue = [start];
        visited[start] = 1;
        let cursor = 0;
        let minX = x; let maxX = x; let minY = y; let maxY = y;
        const componentLimit = maximumDiameter * maximumDiameter * 2;
        while (cursor < queue.length && queue.length <= componentLimit) {
          const pixel = queue[cursor++];
          const pixelX = pixel % width;
          const pixelY = Math.floor(pixel / width);
          minX = Math.min(minX, pixelX); maxX = Math.max(maxX, pixelX);
          minY = Math.min(minY, pixelY); maxY = Math.max(maxY, pixelY);
          for (const neighbor of [pixel - 1, pixel + 1, pixel - width, pixel + width]) {
            if (neighbor < 0 || neighbor >= visited.length || visited[neighbor] || !isDark(neighbor)) continue;
            if (Math.abs(neighbor % width - pixelX) > 1) continue;
            visited[neighbor] = 1;
            queue.push(neighbor);
          }
        }
        const componentWidth = maxX - minX + 1;
        const componentHeight = maxY - minY + 1;
        const aspect = componentWidth / Math.max(componentHeight, 1);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        if (
          queue.length < 24 || queue.length > componentLimit
          || componentWidth < minimumDiameter || componentHeight < minimumDiameter
          || componentWidth > maximumDiameter || componentHeight > maximumDiameter
          || aspect < 0.7 || aspect > 1.42
          || candidates.some((candidate) => Math.hypot(candidate.x - centerX, candidate.y - centerY) < duplicateDistance)
        ) continue;
        candidates.push({
          fillScore: measureInnerInk(imageData, centerX, centerY, Math.min(componentWidth, componentHeight) / 2),
          height: componentHeight,
          width: componentWidth,
          x: centerX,
          y: centerY,
        });
      }
    }
  }
  return candidates;
}

function measureInnerInk(imageData: ImageData, centerX: number, centerY: number, radius: number) {
  const outer: number[] = [];
  for (let index = 0; index < 12; index += 1) {
    const angle = (index * Math.PI * 2) / 12;
    outer.push(readLuminance(imageData, centerX + Math.cos(angle) * radius * 1.3, centerY + Math.sin(angle) * radius * 1.3));
  }
  outer.sort((left, right) => left - right);
  const background = outer[Math.floor(outer.length * 0.7)] ?? 180;
  let ink = 0;
  let total = 0;
  for (let y = Math.floor(centerY - radius * 0.48); y <= Math.ceil(centerY + radius * 0.48); y += 1) {
    for (let x = Math.floor(centerX - radius * 0.48); x <= Math.ceil(centerX + radius * 0.48); x += 1) {
      if (Math.hypot(x - centerX, y - centerY) > radius * 0.48 || x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) continue;
      const offset = (y * imageData.width + x) * 4;
      if (luminance(imageData.data, offset) < background - 24) ink += 1;
      total += 1;
    }
  }
  return ink / Math.max(total, 1);
}

function selectExpectedTracks(rawTracks: CandidateTrack[], questionCount: number, alternativeCount: number) {
  const layout = getQuestionLayout(questionCount, Array.from({ length: alternativeCount }, (_, index) => String(index)));
  const expectedTrackCount = layout.columnCount * alternativeCount;
  if (rawTracks.length < expectedTrackCount) return null;
  const selected = [...rawTracks]
    .sort((left, right) => right.items.length - left.items.length)
    .slice(0, expectedTrackCount)
    .sort((left, right) => left.center - right.center);
  return Array.from({ length: layout.columnCount }, (_, index) => selected.slice(index * alternativeCount, (index + 1) * alternativeCount));
}

function inferColumnTracks(rawTracks: CandidateTrack[]) {
  const strongTracks = rawTracks.filter((track) => track.items.length >= Math.max(5, Math.floor(mode(rawTracks.map((item) => item.items.length)) * 0.55)));
  if (strongTracks.length < 2) return null;
  const gaps = strongTracks.slice(1).map((track, index) => track.center - strongTracks[index].center);
  const sortedGaps = [...gaps].sort((left, right) => left - right);
  const typicalGap = sortedGaps[Math.floor(Math.max(0, sortedGaps.length * 0.45))] ?? 0;
  if (typicalGap <= 0) return null;
  const columns: CandidateTrack[][] = [[]];
  for (const track of strongTracks) {
    const current = columns.at(-1)!;
    if (current.length && track.center - current.at(-1)!.center > typicalGap * 1.7) columns.push([]);
    columns.at(-1)!.push(track);
  }
  const alternativeCount = mode(columns.map((column) => column.length).filter((count) => count >= 2 && count <= 10));
  const valid = columns.filter((column) => column.length === alternativeCount);
  return valid.length >= 1 && valid.length <= 3 ? valid : null;
}

function selectRegularBands(bands: BubbleCandidate[][], expectedRows: number) {
  if (bands.length <= expectedRows) return bands;
  let best = bands.slice(0, expectedRows);
  let bestScore = Number.POSITIVE_INFINITY;
  for (let start = 0; start <= bands.length - expectedRows; start += 1) {
    const candidate = bands.slice(start, start + expectedRows);
    const centers = candidate.map((band) => mean(band.map((item) => item.y)));
    const gaps = centers.slice(1).map((center, index) => center - centers[index]);
    const typicalGap = median(gaps);
    const irregularity = gaps.reduce((total, gap) => total + Math.abs(gap - typicalGap), 0);
    const occupancy = candidate.reduce((total, band) => total + band.length, 0);
    const score = irregularity * 10 - occupancy;
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

function selectLongestRegularBandRun(bands: BubbleCandidate[][]) {
  if (bands.length < 3) return bands;
  const centers = bands.map((band) => mean(band.map((item) => item.y)));
  const gaps = centers.slice(1).map((center, index) => center - centers[index]);
  const typicalGap = median([...gaps].sort((left, right) => left - right).slice(0, Math.max(1, Math.ceil(gaps.length * 0.75))));
  const runs: BubbleCandidate[][][] = [[bands[0]]];
  for (let index = 1; index < bands.length; index += 1) {
    const gap = centers[index] - centers[index - 1];
    if (gap < typicalGap * 0.48 || gap > typicalGap * 1.7) runs.push([]);
    runs.at(-1)!.push(bands[index]);
  }
  return runs.sort((left, right) => right.length - left.length || right.reduce((sum, band) => sum + band.length, 0) - left.reduce((sum, band) => sum + band.length, 0))[0] ?? [];
}

function predictTrackX(track: CandidateTrack, y: number) {
  if (track.items.length < 2) return track.center;
  const averageY = mean(track.items.map((item) => item.y));
  const averageX = mean(track.items.map((item) => item.x));
  let numerator = 0;
  let denominator = 0;
  for (const item of track.items) {
    numerator += (item.y - averageY) * (item.x - averageX);
    denominator += (item.y - averageY) ** 2;
  }
  return averageX + (denominator ? numerator / denominator : 0) * (y - averageY);
}

function clusterCandidates(candidates: BubbleCandidate[], axis: "x" | "y", tolerance: number) {
  const groups: BubbleCandidate[][] = [];
  for (const candidate of [...candidates].sort((left, right) => left[axis] - right[axis])) {
    const group = groups.find((items) => Math.abs(mean(items.map((item) => item[axis])) - candidate[axis]) <= tolerance);
    if (group) group.push(candidate);
    else groups.push([candidate]);
  }
  return groups;
}

function getTypicalDiameter(candidates: BubbleCandidate[]) {
  const histogram = new Map<number, number>();
  for (const candidate of candidates) {
    const bucket = Math.max(2, Math.round(Math.max(candidate.width, candidate.height) / 2) * 2);
    histogram.set(bucket, (histogram.get(bucket) ?? 0) + 1);
  }
  return [...histogram].sort((left, right) => right[1] - left[1] || right[0] - left[0])[0]?.[0] ?? 16;
}

function readLuminance(imageData: ImageData, x: number, y: number) {
  const sampleX = Math.max(0, Math.min(imageData.width - 1, Math.round(x)));
  const sampleY = Math.max(0, Math.min(imageData.height - 1, Math.round(y)));
  return luminance(imageData.data, (sampleY * imageData.width + sampleX) * 4);
}

function luminance(data: Uint8ClampedArray, offset: number) {
  return data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function mode(values: number[]) {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].sort((left, right) => right[1] - left[1] || right[0] - left[0])[0]?.[0] ?? 0;
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
}
