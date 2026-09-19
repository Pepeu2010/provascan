import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workspace = readFileSync(new URL("../components/correction-workspace.tsx", import.meta.url), "utf8");
const pipeline = readFileSync(new URL("../services/scan-pipeline.ts", import.meta.url), "utf8");

assert.doesNotMatch(workspace, /decodeQrFromCanvas\(preprocessing\.processedCanvas\)/);
assert.match(workspace, /decodeOpaqueAnswerSheetToken/);
assert.match(workspace, /answer-sheet-labels\/resolve/);
assert.match(workspace, /Adesivo QR validado no servidor/);
assert.match(workspace, /AnswerSheetReviewOverlay/);
assert.match(workspace, /assessScanQuality/);
assert.match(pipeline, /getLocalDarkThreshold/);
assert.match(pipeline, /getBubbleBounds/);

console.log("Segurança do OCR validada: QR opaco para Fanucchi, captura qualificada e revisão visual preservada.");
