import assert from "node:assert/strict";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { analyzeAnswerSheetCanvas } from "../services/scan-pipeline";

Object.assign(globalThis, { document: { createElement: () => createCanvas(1, 1) } });

const cases = [
  {
    answers: ["A", "C", "E", "B", "A", "D", "C", "B", "E", "D"],
    file: "provascan-card-10q-clean.png",
  },
  {
    answers: ["A", "C", "E", "B", "A", "D", "", "C", "B", "D"],
    file: "provascan-card-10q-phone-photo.png",
  },
  {
    answers: [
      "B", "D", "C", "A", "E", "B", "D", "A", "C", "E", "B", "D", "C", "A", "E",
      "D", "B", "E", "A", "C", "D", "B", "E", "A", "C", "D", "B", "E", "A", "C",
      "B", "D", "A", "C", "E", "B", "D", "A", "C", "E", "B", "D", "A", "C", "E",
    ],
    file: "provascan-card-45q-phone-photo.png",
  },
] as const;

async function main() {
  for (const fixture of cases) {
    const image = await loadImage(path.resolve("fixtures/ocr", fixture.file));
    const canvas = createCanvas(image.width, image.height);
    canvas.getContext("2d").drawImage(image, 0, 0);
    const analysis = await analyzeAnswerSheetCanvas({
      answerKeyLength: fixture.answers.length,
      canvas: canvas as unknown as HTMLCanvasElement,
      expectedTemplateId: "PS-CARD-2",
    });
    assert.deepEqual(
      analysis.answers.map((answer) => answer.markedAnswers[0] ?? ""),
      fixture.answers,
      `${fixture.file} deve recuperar todas as respostas anotadas.`,
    );
  }
  console.log("Fotos reais do cartão aprovadas.");
}

void main();
