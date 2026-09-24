import assert from "node:assert/strict";
import { groupCompleteSheets, groupCompleteSheetsWithSources, requiresManualMarkReview } from "../lib/universal-sheet-validation";

const rows = (start: number, count: number) => Array.from({ length: count }, (_, index) => start + index);
assert.deepEqual(groupCompleteSheets([rows(1, 10)], 10), [rows(1, 10)]);
assert.deepEqual(groupCompleteSheets([rows(1, 5), rows(6, 5)], 10), [rows(1, 10)]);
assert.deepEqual(groupCompleteSheets([rows(1, 10), rows(11, 10)], 10), [rows(1, 10), rows(11, 10)]);
assert.deepEqual(groupCompleteSheetsWithSources([rows(1, 5), rows(6, 5), rows(11, 5), rows(16, 5)], 10).map((sheet) => sheet.firstPageIndex), [0, 2]);
assert.throws(() => groupCompleteSheets([rows(1, 11)], 10), /11 linhas/);
assert.throws(() => groupCompleteSheets([rows(1, 6), rows(7, 5)], 10), /11 linhas/);
assert.throws(() => groupCompleteSheets([rows(1, 6), rows(7, 10)], 10), /incompleta/);
assert.throws(() => groupCompleteSheets([rows(1, 9)], 10), /incompleta/);
assert.throws(() => groupCompleteSheets([], 10), /Nenhuma folha/);
assert.throws(() => groupCompleteSheets([rows(1, 10)], 0), /quantidade/);
assert.equal(requiresManualMarkReview({ confidence: 0.94, status: "marked" }, false), false);
assert.equal(requiresManualMarkReview({ confidence: 0.74, status: "marked" }, false), true);
assert.equal(requiresManualMarkReview({ confidence: 0.95, status: "marked" }, true), true);
assert.equal(requiresManualMarkReview({ confidence: 0.91, status: "multiple_marks" }, false), true);
console.log("Universal sheet validation passed.");
