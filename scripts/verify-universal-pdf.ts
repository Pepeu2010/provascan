import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
import { analyzeUniversalPage } from "../services/universal-layout-analysis";

type SharpImage = {
  jpeg(options: { quality: number }): SharpImage;
  metadata(): Promise<{ height?: number; width?: number }>;
  toBuffer(): Promise<Buffer>;
};
const sharp = createRequire(import.meta.url)("sharp") as (input: string | Buffer) => SharpImage;

Object.assign(globalThis, {
  DOMMatrix,
  ImageData,
  Path2D,
  document: { createElement: () => createCanvas(1, 1) },
});

function buildScannedPdf(jpeg: Buffer, width: number, height: number, pageCount: number) {
  const content = Buffer.from("q\n612 0 0 650 0 71 cm\n/Im0 Do\nQ\n", "ascii");
  const imageObject = 3 + pageCount * 2;
  const pageObjects = Array.from({ length: pageCount }, (_, index) => 3 + index * 2);
  const objects: Buffer[] = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "ascii"),
    Buffer.from(`<< /Type /Pages /Kids [${pageObjects.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`, "ascii"),
    ...pageObjects.flatMap((pageObject) => [
      Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 ${imageObject} 0 R >> >> /Contents ${pageObject + 1} 0 R >>`, "ascii"),
      Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`, "ascii"), content, Buffer.from("endstream", "ascii")]),
    ]),
    Buffer.concat([
      Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, "ascii"),
      jpeg,
      Buffer.from("\nendstream", "ascii"),
    ]),
  ];
  const chunks = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary")];
  const offsets = [0];
  let length = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const chunk = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`, "ascii"), object, Buffer.from("\nendobj\n", "ascii")]);
    chunks.push(chunk);
    length += chunk.length;
  });
  const xrefOffset = length;
  const xref = ["xref", `0 ${objects.length + 1}`, "0000000000 65535 f ", ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `), "trailer", `<< /Size ${objects.length + 1} /Root 1 0 R >>`, "startxref", String(xrefOffset), "%%EOF", ""].join("\n");
  chunks.push(Buffer.from(xref, "ascii"));
  return Buffer.concat(chunks);
}

async function main() {
  const source = path.resolve("fixtures/ocr/provascan-card-10q-clean.png");
  const metadata = await sharp(source).metadata();
  assert.ok(metadata.width && metadata.height, "A imagem-base precisa ter dimensões válidas.");
  const jpeg = await sharp(fs.readFileSync(source)).jpeg({ quality: 92 }).toBuffer();
  const singlePageBytes = buildScannedPdf(jpeg, metadata.width, metadata.height, 1);
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const singlePageTask = getDocument({ data: new Uint8Array(singlePageBytes), disableFontFace: true });
  const singlePageDocument = await singlePageTask.promise;
  assert.equal(singlePageDocument.numPages, 1, "O PDF de uma página precisa permanecer uma página.");
  await singlePageTask.destroy();

  const pdfBytes = buildScannedPdf(jpeg, metadata.width, metadata.height, 2);
  const documentTask = getDocument({ data: new Uint8Array(pdfBytes), disableFontFace: true });
  const document = await documentTask.promise;
  assert.equal(document.numPages, 2, "O PDF multipágina precisa manter suas duas páginas.");
  const expected = ["A", "C", "E", "B", "A", "D", "C", "B", "E", "D"];
  const durations: number[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const startedAt = performance.now();
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvas: canvas as never, canvasContext: canvas.getContext("2d") as never, viewport }).promise;
    const analysis = analyzeUniversalPage(canvas as unknown as HTMLCanvasElement).layout;
    assert.equal(analysis.rows.length, 10);
    assert.deepEqual(analysis.rows.map((row) => expectedAlphabet(row.marks.markedIndexes[0])), expected);
    durations.push(performance.now() - startedAt);
  }
  durations.sort((left, right) => left - right);
  const p50 = Math.round(durations[Math.ceil((durations.length - 1) * 0.5)]);
  const p95 = Math.round(durations[Math.ceil((durations.length - 1) * 0.95)]);
  console.log(`PDF escaneado multipágina: 2/2 páginas, 20/20 respostas, P50 ${p50} ms, P95 ${p95} ms.`);
  await documentTask.destroy();
}

function expectedAlphabet(index: number) {
  return ["A", "B", "C", "D", "E"][index] ?? "";
}

void main();
