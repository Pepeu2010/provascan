import assert from "node:assert/strict";
import { compareSheetsValues, equalSheetsValue, isSheetsNull } from "../lib/sheets-query-values";

assert.equal(equalSheetsValue("", null), false, "texto vazio deve permanecer distinto de null");
assert.equal(equalSheetsValue("1", 1), false, "texto numérico deve permanecer distinto do número");
assert.equal(equalSheetsValue(false, "false"), false, "texto booleano deve permanecer distinto do booleano");
assert.equal(isSheetsNull(""), false, "texto vazio não é null");
assert.equal(isSheetsNull(null), true);
assert.equal(compareSheetsValues("", null), 1, "texto vazio deve ter ordenação própria em relação a null");
assert.equal(compareSheetsValues(null, ""), -1);
assert.equal(compareSheetsValues(2, 10), -8);
assert.equal(compareSheetsValues("10", "2"), 1, "ordenação textual usa comparação numérica localizada");

console.log("Adapter Sheets: filtros e ordenação preservam tipos, texto vazio e null.");
