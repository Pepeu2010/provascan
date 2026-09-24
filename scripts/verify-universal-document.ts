import assert from "node:assert/strict";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { validateDocumentHeader } from "../services/document-ingestion";
import { groupBubbleCandidates, type BubbleCandidate } from "../services/universal-layout-analysis";
import { analyzeUniversalAnswerSheet, analyzeUniversalPage } from "../services/universal-layout-analysis";

const ascii = (value: string) => Uint8Array.from([...value].map((character) => character.charCodeAt(0)));

assert.equal(validateDocumentHeader({ bytes: ascii("%PDF-1.7"), mimeType: "application/pdf", name: "prova.pdf", size: 2_000 }).kind, "pdf");
assert.equal(validateDocumentHeader({ bytes: Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]), mimeType: "image/jpeg", name: "foto.jpg", size: 2_000 }).kind, "image");
assert.equal(validateDocumentHeader({ bytes: Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), mimeType: "image/png", name: "foto.png", size: 2_000 }).kind, "image");
assert.throws(
  () => validateDocumentHeader({ bytes: ascii("<script>"), mimeType: "application/pdf", name: "prova.pdf", size: 2_000 }),
  /conteúdo não corresponde/i,
);
assert.throws(
  () => validateDocumentHeader({ bytes: ascii("%PDF-1.7"), mimeType: "application/pdf", name: "../prova.pdf", size: 2_000 }),
  /nome do arquivo/i,
);

const bubbles: BubbleCandidate[] = [];
for (const columnX of [100, 500]) {
  for (const rowY of [100, 150, 200]) {
    for (let alternative = 0; alternative < 5; alternative += 1) {
      bubbles.push({
        fillScore: columnX === 100 && rowY === 150 && alternative === 2 ? 0.92 : 0.08,
        height: 18,
        width: 18,
        x: columnX + alternative * 30,
        y: rowY,
      });
    }
  }
}

const layout = groupBubbleCandidates(bubbles);
assert.equal(layout.columnCount, 2);
assert.equal(layout.alternativeCount, 5);
assert.equal(layout.rows.length, 6);
assert.deepEqual(layout.rows.map((row) => row.question), [1, 2, 3, 4, 5, 6]);
assert.deepEqual(layout.rows[1].marks.markedIndexes, [2]);
assert.equal(layout.rows[1].marks.status, "marked");
assert.equal(layout.rows[4].marks.status, "blank");

Object.assign(globalThis, { document: { createElement: () => createCanvas(1, 1) } });

async function verifyRealPhotos() {
  const expected = ["A", "C", "E", "B", "A", "D", "C", "B", "E", "D"];
  const cleanImage = await loadImage(path.resolve("fixtures/ocr/provascan-card-10q-clean.png"));
  const cleanCanvas = createCanvas(cleanImage.width, cleanImage.height);
  cleanCanvas.getContext("2d").drawImage(cleanImage, 0, 0);
  const clean = analyzeUniversalAnswerSheet(cleanCanvas as unknown as HTMLCanvasElement);
  assert.equal(clean.rows.length, 10);
  assert.deepEqual(clean.rows.map((row) => row.marks.markedIndexes[0]).map((index) => ["A", "B", "C", "D", "E"][index]), expected);

  const faintImage = await loadImage(path.resolve("fixtures/ocr/provascan-card-10q-faint-blue.png"));
  const faintCanvas = createCanvas(faintImage.width, faintImage.height);
  faintCanvas.getContext("2d").drawImage(faintImage, 0, 0);
  const faint = analyzeUniversalAnswerSheet(faintCanvas as unknown as HTMLCanvasElement);
  assert.deepEqual(faint.rows.map((row) => row.marks.markedIndexes[0]).map((index) => ["A", "B", "C", "D", "E"][index]), expected);

  const phoneImage = await loadImage(path.resolve("fixtures/ocr/provascan-card-45q-phone-photo.png"));
  const phoneCanvas = createCanvas(phoneImage.width, phoneImage.height);
  phoneCanvas.getContext("2d").drawImage(phoneImage, 0, 0);
  const phoneAnalysis = analyzeUniversalPage(phoneCanvas as unknown as HTMLCanvasElement);
  assert.ok(phoneAnalysis.layout.rows.length >= 40, "A análise estrutural deve recuperar ao menos 40 das 45 linhas desta foto difícil.");

  const collaborativeImage = await loadImage(path.resolve("fixtures/ocr/provascan-card-30q-3-subjects-phone-photo.png"));
  const collaborativeCanvas = createCanvas(collaborativeImage.width, collaborativeImage.height);
  collaborativeCanvas.getContext("2d").drawImage(collaborativeImage, 0, 0);
  const collaborative = analyzeUniversalPage(collaborativeCanvas as unknown as HTMLCanvasElement);
  const collaborativeExpected = [
    "A", "C", "B", "B", "E", "B", "A", "A", "B", "E", "A", "B", "A", "C", "E",
    "B", "A", "B", "C", "E", "A", "C", "B", "D", "B", "A", "A", "C", "B", "C",
  ];
  assert.equal(collaborative.layout.rows.length, 30, "A foto real do modelo colaborativo deve preservar as 30 linhas.");
  assert.deepEqual(
    collaborative.layout.rows.map((row) => ["A", "B", "C", "D", "E"][row.marks.markedIndexes[0]] ?? ""),
    collaborativeExpected,
    "A foto real do modelo colaborativo deve recuperar as marcações na ordem das questões.",
  );

  console.log(`Entrada segura e OCR estrutural: 20/20 respostas nos scans, ${phoneAnalysis.layout.rows.length}/45 linhas na foto difícil e 30/30 no modelo colaborativo.`);
}

void verifyRealPhotos();
