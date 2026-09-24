import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { requiresManualMarkReview } from "../lib/universal-sheet-validation";
import { analyzeUniversalPage } from "../services/universal-layout-analysis";

type Fixture = { answers?: string; expectedOutcome: "accept" | "reject"; expectedQuestions: number; file: string; origin: "synthetic" | "real" };
const fixtures = JSON.parse(fs.readFileSync(path.resolve("fixtures/ocr/ground-truth.json"), "utf8")) as Fixture[];
const alternatives = ["A", "B", "C", "D", "E"];
Object.assign(globalThis, { document: { createElement: () => createCanvas(1, 1) } });

async function main() {
  let correctAutomatic = 0;
  let silentErrors = 0;
  let review = 0;
  let rejected = 0;
  let rejectedQuestions = 0;
  let total = 0;
  for (const fixture of fixtures) {
    assert.match(fixture.file, /^[\w.-]+\.png$/);
    if (fixture.answers) assert.match(fixture.answers, /^[A-E]+$/);
    if (fixture.expectedOutcome === "accept") assert.equal(fixture.answers?.length, fixture.expectedQuestions);
    const image = await loadImage(path.resolve("fixtures/ocr", fixture.file));
    const canvas = createCanvas(image.width, image.height);
    canvas.getContext("2d").drawImage(image, 0, 0);
    total += fixture.expectedQuestions;
    let analysis: ReturnType<typeof analyzeUniversalPage> | null = null;
    try {
      analysis = analyzeUniversalPage(canvas as unknown as HTMLCanvasElement, {
        alternativeCount: 5,
        questionCount: fixture.expectedQuestions,
      });
    } catch (error) {
      if (fixture.expectedOutcome !== "reject") throw error;
      rejected += 1;
      rejectedQuestions += fixture.expectedQuestions;
      continue;
    }
    assert.equal(fixture.expectedOutcome, "accept", `${fixture.file}: uma folha incompleta foi aceita.`);
    for (const [index, row] of analysis.layout.rows.entries()) {
      if (requiresManualMarkReview(row.marks, analysis.disputedQuestions.has(index + 1))) {
        review += 1;
        continue;
      }
      const answer = alternatives[row.marks.markedIndexes[0]] ?? "";
      if (answer === fixture.answers?.[index]) correctAutomatic += 1;
      else silentErrors += 1;
    }
  }
  const metrics = { automatic: correctAutomatic, fixtures: fixtures.length, realFixtures: fixtures.filter((fixture) => fixture.origin === "real").length, rejected, rejectedQuestions, review, silentErrors, total };
  console.log(JSON.stringify(metrics));
  assert.equal(correctAutomatic + review + rejectedQuestions + silentErrors, total);
  assert.equal(silentErrors, 0, "Uma resposta errada foi aceita sem revisão.");
  assert.ok(correctAutomatic > 0, "Nenhuma resposta foi corrigida automaticamente.");
}

void main();
