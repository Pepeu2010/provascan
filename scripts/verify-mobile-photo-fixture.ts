import assert from "node:assert/strict";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { analyzeAnswerSheetCanvas } from "../services/scan-pipeline";
import { rectifyMobilePhoto } from "../services/mobile-photo-rectification";

const answers = Array.from({ length: 45 }, (_, index) => ["A", "C", "E", "B", "D"][index % 5]);

Object.assign(globalThis, { document: { createElement: () => createCanvas(1, 1) } });

async function main() {
  const card = await loadImage(path.resolve("fixtures/ocr/ps-card-2-45q-test.png"));
  const phonePhoto = createCanvas(1220, 1560);
  const photoContext = phonePhoto.getContext("2d");
  photoContext.fillStyle = "#46505a";
  photoContext.fillRect(0, 0, phonePhoto.width, phonePhoto.height);

  // Simulated hand-held phone capture: a full page, darker desk area and
  // a small oblique angle before the document is rectified.
  photoContext.save();
  photoContext.translate(170, 120);
  photoContext.transform(1.01, 0.025, -0.035, 1.02, 0, 0);
  photoContext.drawImage(card, 0, 0, 840, 1185);
  photoContext.restore();

  const normalized = rectifyMobilePhoto(phonePhoto as unknown as HTMLCanvasElement, 794 / 1123);
  assert.equal(normalized.applied, true, "A folha fotografada deve ser identificada e retificada.");
  const analysis = await analyzeAnswerSheetCanvas({
    answerKeyLength: 45,
    canvas: normalized.canvas,
    expectedTemplateId: "PS-CARD-2",
  });
  assert.deepEqual(analysis.answers.map((item) => item.markedAnswers[0] ?? ""), answers);
  console.log("Mobile photo fixture passed: 45/45 respostas após retificação.");
}

void main();
