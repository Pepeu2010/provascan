import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { ANSWER_SHEET_TEMPLATE, getBubbleBounds } from "../services/answer-sheet-template";
import { analyzeAnswerSheetCanvas } from "../services/scan-pipeline";

const alternatives = ["A", "B", "C", "D", "E"];

Object.assign(globalThis, { document: { createElement: () => createCanvas(1, 1) } });

async function main() {
for (let subjectCount = 3; subjectCount <= 8; subjectCount += 1) {
  const questionCount = subjectCount * 10;
  const expected = Array.from({ length: questionCount }, (_, index) => alternatives[(index * 3 + subjectCount) % alternatives.length]);
  const expectedMarks = expected.map((answer) => [answer]);
  if (subjectCount === 3) {
    expectedMarks[6] = [];
    expectedMarks[17] = ["B", "D"];
  }
  const card = createCanvas(ANSWER_SHEET_TEMPLATE.page.width, ANSWER_SHEET_TEMPLATE.page.height);
  const cardContext = card.getContext("2d");
  cardContext.fillStyle = "#ffffff";
  cardContext.fillRect(0, 0, card.width, card.height);

  for (let questionIndex = 0; questionIndex < questionCount; questionIndex += 1) {
    for (const bubble of getBubbleBounds({ alternatives, canvasHeight: card.height, canvasWidth: card.width, questionCount, questionIndex })) {
      cardContext.beginPath();
      cardContext.arc(bubble.cx, bubble.cy, bubble.radius * 0.82, 0, Math.PI * 2);
      cardContext.lineWidth = Math.max(1.6, bubble.radius * 0.16);
      cardContext.strokeStyle = "#172033";
      cardContext.fillStyle = expectedMarks[questionIndex].includes(bubble.alternative) ? "#090b10" : "#ffffff";
      cardContext.fill();
      cardContext.stroke();
    }
  }

  const photo = createCanvas(940, 1380);
  const photoContext = photo.getContext("2d");
  photoContext.fillStyle = "#8b765d";
  photoContext.fillRect(0, 0, photo.width, photo.height);
  photoContext.save();
  photoContext.translate(102 + subjectCount * 2, 118);
  photoContext.transform(0.91, 0.018, -0.026, 0.93, 0, 0);
  photoContext.drawImage(card, 0, 0);
  photoContext.restore();
  const shadow = photoContext.createLinearGradient(0, 460, 0, 1230);
  shadow.addColorStop(0, "rgba(20, 25, 35, 0)");
  shadow.addColorStop(1, "rgba(20, 25, 35, 0.34)");
  photoContext.fillStyle = shadow;
  photoContext.fillRect(75, 420, 790, 820);

  const analysis = await analyzeAnswerSheetCanvas({ answerKeyLength: questionCount, canvas: photo as unknown as HTMLCanvasElement, expectedTemplateId: "PS-CARD-2" });
  const actual = analysis.answers.map((answer) => answer.markedAnswers.join(""));
  assert.equal(analysis.answers.length, questionCount, `${subjectCount} matérias devem produzir exatamente ${questionCount} linhas.`);
  assert.deepEqual(actual, expectedMarks.map((marks) => marks.join("")), `${subjectCount} matérias devem preservar qualquer alternativa marcada.`);
  if (subjectCount === 3) {
    assert.equal(analysis.answers[6].status, "BLANK", "Questão sem preenchimento não pode receber resposta inventada.");
    assert.equal(analysis.answers[17].status, "MULTIPLE", "Duas bolhas marcadas precisam ir para revisão.");
  }
}

console.log("Cartões oficiais de 3 a 8 matérias: todas as questões reconhecidas.");
}

void main();
