export type ScanQuality = {
  blurRisk: boolean;
  edgeEnergy: number;
  lowLight: boolean;
  requiresRecapture: boolean;
  shadowRisk: boolean;
};

/**
 * Quality checks must run before binarization: a binary image can make a
 * blurred photo look deceptively crisp. This function intentionally only
 * blocks images that cannot support a safe bubble decision; light/shadow
 * remain review signals because they can still be corrected by a teacher.
 */
export function assessScanQuality(image: ImageData): ScanQuality {
  const { data, height, width } = image;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 280));
  let total = 0;
  let totalSquares = 0;
  let count = 0;
  let edgeTotal = 0;
  let edgeCount = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4;
      const luminance = pixelLuminance(data, index);
      total += luminance;
      totalSquares += luminance * luminance;
      count += 1;

      if (x + step < width) {
        edgeTotal += Math.abs(luminance - pixelLuminance(data, (y * width + x + step) * 4));
        edgeCount += 1;
      }
      if (y + step < height) {
        edgeTotal += Math.abs(luminance - pixelLuminance(data, ((y + step) * width + x) * 4));
        edgeCount += 1;
      }
    }
  }

  const average = total / Math.max(count, 1);
  const deviation = Math.sqrt(Math.max(0, totalSquares / Math.max(count, 1) - average * average));
  const edgeEnergy = edgeTotal / Math.max(edgeCount, 1);
  const lowLight = average < 92;
  const shadowRisk = deviation > 68;
  const blurRisk = edgeEnergy < 3.2;
  const tooSmall = Math.min(width, height) < 540;

  return {
    blurRisk,
    edgeEnergy,
    lowLight,
    requiresRecapture: blurRisk || tooSmall,
    shadowRisk,
  };
}

function pixelLuminance(data: Uint8ClampedArray, index: number) {
  return data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
}
