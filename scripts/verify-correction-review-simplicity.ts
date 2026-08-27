import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../components/correction-workspace.tsx", import.meta.url), "utf8");

assert.match(source, /Confira o cartão do aluno/);
assert.match(source, /Respostas marcadas pelo aluno/);
assert.match(source, /Aluno marcou/);
assert.match(source, /Corrigir resposta/);
assert.match(source, /Adicionar uma observação \(opcional\)/);
assert.doesNotMatch(source, /Ver detalhes técnicos da leitura/);
assert.doesNotMatch(source, /Filtros de revisão/);
assert.doesNotMatch(source, /% de confiança/);

console.log("Correction review simplicity checks passed.");
