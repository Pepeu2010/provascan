import assert from "node:assert/strict";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { getQuestionLayout } from "../services/answer-sheet-template";
import { analyzeAnswerSheetCanvas } from "../services/scan-pipeline";

const questionCount = 45;
const expectedAnswers = Array.from({ length: questionCount }, (_, index) => ["A", "C", "E", "B", "D"][index % 5]);
const layout = getQuestionLayout(questionCount, ["A", "B", "C", "D", "E"]);

assert.equal(layout.columnCount, 3, "O cartão de 45 questões deve usar três colunas.");
assert.equal(layout.rowsPerColumn, 15, "Cada coluna do cartão de 45 questões deve ter quinze linhas.");

// The production pipeline only needs a canvas-shaped object. This small DOM
// shim lets its crop helper create canvases in Node for the regression test.
Object.assign(globalThis, {
  document: {
    createElement: () => createCanvas(1, 1),
  },
});

async function main() {
  const imagePath = path.resolve("fixtures/ocr/ps-card-2-45q-test.png");
  const image = await loadImage(imagePath);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);

  const analysis = await analyzeAnswerSheetCanvas({
    answerKeyLength: questionCount,
    canvas: canvas as unknown as HTMLCanvasElement,
    expectedTemplateId: "PS-CARD-2",
  });

  assert.equal(analysis.totalQuestions, questionCount);
  assert.deepEqual(
    analysis.answers.map((answer) => answer.markedAnswers[0] ?? ""),
    expectedAnswers,
    "O leitor deve recuperar as 45 respostas da imagem controlada.",
  );

  console.log(`OCR fixture passed: ${questionCount}/${questionCount} respostas corretas.`);
}

void main();
