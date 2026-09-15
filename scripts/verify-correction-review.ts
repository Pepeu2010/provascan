import assert from "node:assert/strict";
import { applyReviewEdit, buildReviewQueue, undoReviewEdit } from "../lib/correction-review";

const answers = [
  { confidence: 0.5, detectedAnswers: ["A", "B"], question: 2, status: "multiple_marks" as const },
  { confidence: 0.4, detectedAnswers: ["C"], question: 1, status: "uncertain" as const },
];
assert.deepEqual(buildReviewQueue([{ answers, sourceLabel: "b.jpg", studentName: "B" }, { answers, sourceLabel: "a.jpg", studentName: "A" }]).map((item) => [item.batchIndex, item.question]), [[0, 1], [0, 2], [1, 1], [1, 2]]);

const edit = applyReviewEdit(answers, 2, "D", "2026-09-14T20:00:00.000Z");
assert.equal(edit.answers[0].detectedAnswers[0], "D");
assert.equal(edit.audit.from, "A+B");
assert.equal(edit.audit.to, "D");
assert.deepEqual(undoReviewEdit(edit.answers, edit.audit), answers);

console.log("Correction review verification passed.");
