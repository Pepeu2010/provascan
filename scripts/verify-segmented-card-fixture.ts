import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { getSegmentedAnswerBlocks, SEGMENTED_BLOCK_METRICS } from "../services/exam-sections";
import { analyzeAnswerSheetCanvas } from "../services/scan-pipeline";

const alternatives = ["A", "B", "C", "D", "E"];
const sections = [
  { id: "portugues", subject: "Português", questionCount: 10 },
  { id: "historia", subject: "História", questionCount: 10 },
  { id: "geografia", subject: "Geografia", questionCount: 10 },
  { id: "filosofia", subject: "Filosofia", questionCount: 8 },
  { id: "ingles", subject: "Inglês", questionCount: 5 },
  { id: "artes", subject: "Artes", questionCount: 5 },
];
const expected = Array.from({ length: 48 }, (_, index) => alternatives[index % alternatives.length]);

Object.assign(globalThis, { document: { createElement: () => createCanvas(1, 1) } });

async function main() {
  const canvas = createCanvas(794, 1123);
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#000";

  for (const block of getSegmentedAnswerBlocks({ quantidadeQuestoes: 48, sections, subject: "" })) {
    const { x, y, width, height } = block.searchWindow;
    const left = x * canvas.width;
    const top = y * canvas.height;
    const blockWidth = width * canvas.width;
    const blockHeight = height * canvas.height;
    const rowHeight = (blockHeight * (SEGMENTED_BLOCK_METRICS.contentBottom - SEGMENTED_BLOCK_METRICS.contentTop)) / block.questionCount;

    for (let index = 0; index < block.questionCount; index += 1) {
      const question = block.questionStart + index;
      const alternativeIndex = alternatives.indexOf(expected[question - 1]);
      const cx = left + blockWidth * (SEGMENTED_BLOCK_METRICS.bubbleStart + ((SEGMENTED_BLOCK_METRICS.bubbleEnd - SEGMENTED_BLOCK_METRICS.bubbleStart) * alternativeIndex) / (alternatives.length - 1));
      const cy = top + blockHeight * SEGMENTED_BLOCK_METRICS.contentTop + rowHeight * index + rowHeight / 2;
      context.beginPath();
      context.arc(cx, cy, Math.max(4, Math.min(blockWidth, rowHeight) * SEGMENTED_BLOCK_METRICS.radiusFactor * 0.72), 0, Math.PI * 2);
      context.fill();
    }
  }

  const analysis = await analyzeAnswerSheetCanvas({
    alternatives,
    answerKeyLength: expected.length,
    canvas: canvas as unknown as HTMLCanvasElement,
    expectedTemplateId: "PS-CARD-3",
    sections,
  });

  assert.equal(analysis.totalQuestions, expected.length);
  assert.deepEqual(analysis.answers.map((answer) => answer.markedAnswers[0] ?? ""), expected);
  assert.deepEqual(analysis.blockAudits.map((block) => block.title), sections.map((section) => section.subject));
  console.log("Segmented card fixture passed: 48/48 respostas em seis disciplinas.");
}

void main();
