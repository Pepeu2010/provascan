import assert from "node:assert/strict";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { getQuestionLayout } from "../services/answer-sheet-template";
import { analyzeAnswerSheetCanvas } from "../services/scan-pipeline";

const questionCounts = [45, 60];

// The production pipeline only needs a canvas-shaped object. This small DOM
// shim lets its crop helper create canvases in Node for the regression test.
Object.assign(globalThis, {
  document: {
    createElement: () => createCanvas(1, 1),
  },
});

async function main() {
  for (const questionCount of questionCounts) {
    const expectedAnswers = Array.from({ length: questionCount }, (_, index) => ["A", "C", "E", "B", "D"][index % 5]);
    const layout = getQuestionLayout(questionCount, ["A", "B", "C", "D", "E"]);
    assert.equal(layout.rowsPerColumn, questionCount === 60 ? 20 : 15, `O cartão de ${questionCount} questões deve usar a grade prevista.`);
    const image = await loadImage(path.resolve(`fixtures/ocr/ps-card-2-${questionCount}q-test.png`));
    const canvas = createCanvas(image.width, image.height);
    canvas.getContext("2d").drawImage(image, 0, 0);
    const analysis = await analyzeAnswerSheetCanvas({ answerKeyLength: questionCount, canvas: canvas as unknown as HTMLCanvasElement, expectedTemplateId: "PS-CARD-2" });
    assert.equal(analysis.totalQuestions, questionCount);
    assert.deepEqual(analysis.answers.map((answer) => answer.markedAnswers[0] ?? ""), expectedAnswers, `O leitor deve recuperar as ${questionCount} respostas controladas.`);
    console.log(`OCR fixture passed: ${questionCount}/${questionCount} respostas corretas.`);
  }
}

void main();
