import assert from "node:assert/strict";
import { buildCalibrationSheetHtml, buildPrintInstructionSheetHtml, getPrintPreflight } from "../lib/print-preflight";

assert.deepEqual(getPrintPreflight({ paperSize: "A4", scalePercent: 100 }), { ready: true, warnings: [] });
const unsafe = getPrintPreflight({ paperSize: "Carta", scalePercent: 95 });
assert.equal(unsafe.ready, false);
assert.match(unsafe.warnings.join(" "), /A4/);
assert.match(unsafe.warnings.join(" "), /100%/);
const html = buildCalibrationSheetHtml();
assert.match(html, /100mm/);
assert.match(html, /box-sizing:border-box;width:210mm/);
assert.match(html, /box-sizing:border-box;width:100mm;height:100mm/);
assert.match(html, /Não.*ajustar.*página/i);
assert.match(html, /régua/i);
assert.match(buildPrintInstructionSheetHtml(), /folha inteira/i);

console.log("Print preflight verification passed.");
