export type DocumentRectification = {
  applied: boolean;
  canvas: HTMLCanvasElement;
  corners?: Array<{ x: number; y: number }>;
};

type Point = { x: number; y: number };

/**
 * Finds the bright sheet inside a phone photo and maps it back to a flat page.
 * It intentionally fails closed: when the page edges are not clear, the
 * original canvas is returned so a bad crop never invents an answer position.
 */
export function rectifyMobilePhoto(
  source: HTMLCanvasElement,
  expectedAspectRatio: number,
  { refineBottomEdge = false }: { refineBottomEdge?: boolean } = {},
): DocumentRectification {
  const context = source.getContext("2d", { willReadFrequently: true });
  if (!context || source.width < 240 || source.height < 240) {
    return { applied: false, canvas: source };
  }

  const image = context.getImageData(0, 0, source.width, source.height);
  const corners = detectSheetCorners(image, refineBottomEdge);
  if (!corners || !isPlausibleSheet(corners, source.width, source.height, expectedAspectRatio)) {
    return { applied: false, canvas: source };
  }

  const left = distance(corners[0], corners[3]);
  const right = distance(corners[1], corners[2]);
  const top = distance(corners[0], corners[1]);
  const bottom = distance(corners[3], corners[2]);
  const targetHeight = Math.round(clamp((left + right) / 2, 960, 2200));
  const targetWidth = Math.round(clamp((top + bottom) / 2, 680, 1800));
  const ratio = targetWidth / targetHeight;
  const normalizedHeight = Math.round(clamp(targetHeight, 960, 2200));
  const normalizedWidth = Math.round(clamp(normalizedHeight * expectedAspectRatio, 680, 1800));

  // Reject an implausible result instead of stretching a partial sheet.
  if (Math.abs(ratio - expectedAspectRatio) / expectedAspectRatio > 0.28) {
    return { applied: false, canvas: source };
  }

  const output = document.createElement("canvas");
  output.width = normalizedWidth;
  output.height = normalizedHeight;
  const outputContext = output.getContext("2d", { willReadFrequently: true });
  if (!outputContext) {
    return { applied: false, canvas: source };
  }

  const outputImage = outputContext.createImageData(normalizedWidth, normalizedHeight);
  const homography = solveProjectiveMap(
    [
      { x: 0, y: 0 },
      { x: normalizedWidth - 1, y: 0 },
      { x: normalizedWidth - 1, y: normalizedHeight - 1 },
      { x: 0, y: normalizedHeight - 1 },
    ],
    corners,
  );
  if (!homography) {
    return { applied: false, canvas: source };
  }

  for (let y = 0; y < normalizedHeight; y += 1) {
    for (let x = 0; x < normalizedWidth; x += 1) {
      const denominator = homography[6] * x + homography[7] * y + 1;
      const sourceX = (homography[0] * x + homography[1] * y + homography[2]) / denominator;
      const sourceY = (homography[3] * x + homography[4] * y + homography[5]) / denominator;
      const targetIndex = (y * normalizedWidth + x) * 4;
      sampleBilinear(image, sourceX, sourceY, outputImage.data, targetIndex);
    }
  }

  outputContext.putImageData(outputImage, 0, 0);
  return { applied: true, canvas: output, corners };
}

function detectSheetCorners(image: ImageData, refineBottomEdge: boolean): Point[] | null {
  const step = Math.max(4, Math.round(Math.min(image.width, image.height) / 180));
  // Leave a generous margin below paper white. Camera exposure, a printed
  // header and mild shadow otherwise make the detected page shrink inward.
  const threshold = clamp(percentileLuminance(image, 0.84) - 54, 128, 208);
  const rowBounds: Array<{ left: number; right: number; y: number }> = [];
  const columnBounds: Array<{ bottom: number; top: number; x: number }> = [];

  for (let y = step; y < image.height - step; y += step) {
    const run = findBrightRun(image, y, step, threshold, "row");
    if (run && run.end - run.start > image.width * 0.38) {
      rowBounds.push({ left: run.start, right: run.end, y });
    }
  }
  for (let x = step; x < image.width - step; x += step) {
    const run = findBrightRun(image, x, step, threshold, "column");
    if (run && run.end - run.start > image.height * 0.38) {
      columnBounds.push({ bottom: run.end, top: run.start, x });
    }
  }

  if (rowBounds.length < 12 || columnBounds.length < 12) return null;
  const middleRows = trimBounds(rowBounds);
  const middleColumns = trimBounds(columnBounds);
  const leftLine = fitLine(middleRows.map((point) => ({ x: point.y, y: point.left })));
  const rightLine = fitLine(middleRows.map((point) => ({ x: point.y, y: point.right })));
  const topLine = fitLine(middleColumns.map((point) => ({ x: point.x, y: point.top })));
  const bottomLine = fitLine(
    refineBottomEdge
      ? refineBottomSheetEdge(image) ?? middleColumns.map((point) => ({ x: point.x, y: point.bottom }))
      : middleColumns.map((point) => ({ x: point.x, y: point.bottom })),
  );
  if (!leftLine || !rightLine || !topLine || !bottomLine) return null;

  const topLeft = intersectLines(leftLine, topLine);
  const topRight = intersectLines(rightLine, topLine);
  const bottomRight = intersectLines(rightLine, bottomLine);
  const bottomLeft = intersectLines(leftLine, bottomLine);
  if (!topLeft || !topRight || !bottomRight || !bottomLeft) return null;
  return [topLeft, topRight, bottomRight, bottomLeft];
}

function findBrightRun(
  image: ImageData,
  coordinate: number,
  step: number,
  threshold: number,
  direction: "column" | "row",
) {
  const limit = direction === "row" ? image.width : image.height;
  const brightOffsets: number[] = [];

  for (let offset = 0; offset < limit; offset += step) {
    const x = direction === "row" ? offset : coordinate;
    const y = direction === "row" ? coordinate : offset;
    if (localLuminance(image, x, y, step) >= threshold) brightOffsets.push(offset);
  }
  if (brightOffsets.length < 8) return null;
  const start = brightOffsets[0];
  const end = brightOffsets.at(-1) ?? start;
  const coverage = brightOffsets.length / Math.max(1, (end - start) / step + 1);
  // Text and bubble outlines create short dark gaps. Treating them as a page
  // boundary is exactly what made phone photos shrink toward the center.
  return coverage >= 0.62 ? { end, start } : null;
}

function localLuminance(image: ImageData, x: number, y: number, radius: number) {
  let total = 0;
  let count = 0;
  for (let sampleY = Math.max(0, y - radius); sampleY <= Math.min(image.height - 1, y + radius); sampleY += Math.max(1, Math.floor(radius / 2))) {
    for (let sampleX = Math.max(0, x - radius); sampleX <= Math.min(image.width - 1, x + radius); sampleX += Math.max(1, Math.floor(radius / 2))) {
      const index = (sampleY * image.width + sampleX) * 4;
      total += image.data[index] * 0.2126 + image.data[index + 1] * 0.7152 + image.data[index + 2] * 0.0722;
      count += 1;
    }
  }
  return count ? total / count : 0;
}

function percentileLuminance(image: ImageData, quantile: number) {
  const samples: number[] = [];
  const step = Math.max(4, Math.round(Math.min(image.width, image.height) / 120));
  for (let y = 0; y < image.height; y += step) {
    for (let x = 0; x < image.width; x += step) samples.push(localLuminance(image, x, y, step));
  }
  samples.sort((left, right) => left - right);
  return samples[Math.min(samples.length - 1, Math.max(0, Math.round((samples.length - 1) * quantile)))] ?? 200;
}

function trimBounds<T>(points: T[]) {
  // Keep the page extremities. They are precisely what fixes perspective;
  // only discard the occasional noisy row/column at the very edge.
  const margin = Math.max(1, Math.floor(points.length * 0.025));
  return points.slice(margin, points.length - margin);
}

function refineBottomSheetEdge(image: ImageData) {
  const samples: Point[] = [];
  const horizontalStep = Math.max(14, Math.round(image.width / 46));
  const verticalStep = Math.max(3, Math.round(image.height / 460));
  const startY = Math.round(image.height * 0.56);
  const endY = Math.round(image.height * 0.95);

  for (let x = horizontalStep * 2; x < image.width - horizontalStep * 2; x += horizontalStep) {
    let bestContrast = 0;
    let bestY = 0;

    for (let y = startY + 18; y < endY - 18; y += verticalStep) {
      const contrast = localLuminance(image, x, y - 18, 10) - localLuminance(image, x, y + 18, 10);
      if (contrast > bestContrast) {
        bestContrast = contrast;
        bestY = y;
      }
    }

    if (bestContrast >= 38) samples.push({ x, y: bestY });
  }

  if (samples.length < 8) return null;
  const initialLine = fitLine(samples);
  if (!initialLine) return null;
  const stableSamples = samples.filter((point) => Math.abs(point.y - (initialLine.slope * point.x + initialLine.intercept)) < image.height * 0.045);
  return stableSamples.length >= 8 ? stableSamples : null;
}

// Lines are represented by y = slope * x + intercept.
function fitLine(points: Point[]) {
  if (points.length < 2) return null;
  const averageX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const averageY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  let numerator = 0;
  let denominator = 0;
  for (const point of points) {
    numerator += (point.x - averageX) * (point.y - averageY);
    denominator += (point.x - averageX) ** 2;
  }
  if (denominator < 0.001) return null;
  const slope = numerator / denominator;
  return { intercept: averageY - slope * averageX, slope };
}

function intersectLines(vertical: { intercept: number; slope: number }, horizontal: { intercept: number; slope: number }) {
  const divisor = 1 - vertical.slope * horizontal.slope;
  if (Math.abs(divisor) < 0.0001) return null;
  const x = (vertical.slope * horizontal.intercept + vertical.intercept) / divisor;
  const y = horizontal.slope * x + horizontal.intercept;
  return { x, y };
}

function isPlausibleSheet(corners: Point[], width: number, height: number, aspectRatio: number) {
  if (corners.some((corner) => corner.x < -width * 0.08 || corner.x > width * 1.08 || corner.y < -height * 0.08 || corner.y > height * 1.08)) return false;
  const area = polygonArea(corners);
  if (area < width * height * 0.26) return false;
  const averageWidth = (distance(corners[0], corners[1]) + distance(corners[3], corners[2])) / 2;
  const averageHeight = (distance(corners[0], corners[3]) + distance(corners[1], corners[2])) / 2;
  return averageHeight > 0 && Math.abs(averageWidth / averageHeight - aspectRatio) / aspectRatio < 0.32;
}

function solveProjectiveMap(from: Point[], to: Point[]) {
  const matrix: number[][] = [];
  for (let index = 0; index < 4; index += 1) {
    const { x, y } = from[index];
    const target = to[index];
    matrix.push([x, y, 1, 0, 0, 0, -x * target.x, -y * target.x, target.x]);
    matrix.push([0, 0, 0, x, y, 1, -x * target.y, -y * target.y, target.y]);
  }
  for (let column = 0; column < 8; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < 8; row += 1) if (Math.abs(matrix[row][column]) > Math.abs(matrix[pivot][column])) pivot = row;
    if (Math.abs(matrix[pivot][column]) < 0.0000001) return null;
    [matrix[column], matrix[pivot]] = [matrix[pivot], matrix[column]];
    const divisor = matrix[column][column];
    for (let cell = column; cell <= 8; cell += 1) matrix[column][cell] /= divisor;
    for (let row = 0; row < 8; row += 1) {
      if (row === column) continue;
      const factor = matrix[row][column];
      for (let cell = column; cell <= 8; cell += 1) matrix[row][cell] -= factor * matrix[column][cell];
    }
  }
  return matrix.map((row) => row[8]);
}

function sampleBilinear(source: ImageData, x: number, y: number, target: Uint8ClampedArray, targetIndex: number) {
  if (x < 0 || y < 0 || x >= source.width - 1 || y >= source.height - 1) {
    target[targetIndex] = 255;
    target[targetIndex + 1] = 255;
    target[targetIndex + 2] = 255;
    target[targetIndex + 3] = 255;
    return;
  }
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const xRatio = x - x0;
  const yRatio = y - y0;
  const indexes = [
    (y0 * source.width + x0) * 4,
    (y0 * source.width + x0 + 1) * 4,
    ((y0 + 1) * source.width + x0) * 4,
    ((y0 + 1) * source.width + x0 + 1) * 4,
  ];
  for (let channel = 0; channel < 4; channel += 1) {
    const top = source.data[indexes[0] + channel] * (1 - xRatio) + source.data[indexes[1] + channel] * xRatio;
    const bottom = source.data[indexes[2] + channel] * (1 - xRatio) + source.data[indexes[3] + channel] * xRatio;
    target[targetIndex + channel] = top * (1 - yRatio) + bottom * yRatio;
  }
}

function polygonArea(points: Point[]) {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0) / 2);
}

function distance(left: Point, right: Point) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
