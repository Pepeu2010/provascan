import assert from "node:assert/strict";
import { assessScanQuality } from "../services/scan-quality";

function image(width: number, height: number, pixel: (x: number, y: number) => number) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const value = pixel(x, y);
    const index = (y * width + x) * 4;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }
  return { data, height, width } as ImageData;
}

const sharpCard = assessScanQuality(image(800, 1120, (x, y) => ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? 230 : 40)));
assert.equal(sharpCard.requiresRecapture, false, "Uma folha nítida não pode ser bloqueada.");

const blurred = assessScanQuality(image(800, 1120, () => 210));
assert.equal(blurred.blurRisk, true, "Uma imagem sem bordas precisa pedir nova captura.");
assert.equal(blurred.requiresRecapture, true, "Imagem desfocada não pode seguir para leitura automática.");

const dark = assessScanQuality(image(800, 1120, () => 60));
assert.equal(dark.lowLight, true, "Foto muito escura deve ser sinalizada.");

console.log("Qualidade de captura validada: nitidez, desfoque e pouca luz.");
