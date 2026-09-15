import assert from "node:assert/strict";
import {
  DRAFT_MAX_AGE_MS,
  buildDraftResumeLabel,
  parseExternalCorrectionDraft,
  serializeExternalCorrectionDraft,
} from "../lib/external-correction-draft";

const now = Date.parse("2026-09-14T20:00:00.000Z");
const serialized = serializeExternalCorrectionDraft({
  alternativeCount: "5",
  answerKey: ["A", "B"],
  answerKeyText: "1 A\n2 B",
  batch: [{
    answers: [],
    elapsedMs: 90,
    grade: { reviewQuestions: [], rows: [], summary: { blank: 0, correct: 2, incorrect: 0, multipleMarks: 0, review: 0, score: 10 } },
    previewUrls: { 1: "data:image/jpeg;base64,private" },
    sourceLabel: "turma.pdf",
    studentName: "Maria",
  }],
  columnCount: "1",
  stage: "review",
  structure: null,
  subjectsText: "Geral:2",
  templateId: null,
  templateName: "Revisão bimestral",
  totalQuestions: "2",
}, now);

assert.ok(!serialized.includes("data:image"), "previews and original image data must never enter local storage");
const parsed = parseExternalCorrectionDraft(serialized, now + 1_000);
assert.ok(parsed, "a current versioned draft should be restored");
assert.equal(parsed?.version, 1);
assert.equal(parsed?.stage, "review");
assert.deepEqual(parsed?.batch[0].previewUrls, {});
assert.equal(buildDraftResumeLabel(parsed!, now + 65_000), "Continuar correção de 1 aluno");

assert.equal(
  parseExternalCorrectionDraft(serialized, now + DRAFT_MAX_AGE_MS + 1),
  null,
  "expired drafts should be ignored",
);
assert.equal(parseExternalCorrectionDraft("not-json", now), null);
assert.equal(parseExternalCorrectionDraft(JSON.stringify({ version: 99 }), now), null);

console.log("External correction draft verification passed.");
