import assert from "node:assert/strict";
import { evaluateCaptureQuality } from "../services/capture-quality";

assert.deepEqual(evaluateCaptureQuality({ brightnessMean: 132, clippedDarkRatio: 0.01, clippedLightRatio: 0.01, edgeInkRatio: 0.08, sharpness: 310 }), {
  accepted: true,
  issues: [],
  score: 100,
});

const poor = evaluateCaptureQuality({ brightnessMean: 48, clippedDarkRatio: 0.24, clippedLightRatio: 0.01, edgeInkRatio: 0.22, sharpness: 42 });
assert.equal(poor.accepted, false);
assert.deepEqual(poor.issues.map((issue) => issue.code), ["dark", "blur", "crop"]);
assert.match(poor.issues[0].advice, /luz/i);

const overexposed = evaluateCaptureQuality({ brightnessMean: 239, clippedDarkRatio: 0, clippedLightRatio: 0.31, edgeInkRatio: 0.03, sharpness: 180 });
assert.deepEqual(overexposed.issues.map((issue) => issue.code), ["bright"]);

console.log("Capture quality verification passed.");
