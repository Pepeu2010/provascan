import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "components", "management-workspace.tsx"), "utf8");
assert.match(source, /Atenção pedagógica/);
assert.match(source, /Aproveitamento abaixo do esperado/);
assert.match(source, /Questão para revisar/);
assert.match(source, /Resumo individual/);
assert.match(source, /Os avisos usam somente as correções filtradas acima/);
console.log("Pedagogical alerts verification passed.");
