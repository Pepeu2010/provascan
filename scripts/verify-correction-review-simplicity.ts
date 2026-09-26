import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../components/correction-workspace.tsx", import.meta.url), "utf8");

assert.match(source, /Confira o cartão do aluno/);
assert.match(source, /Respostas marcadas pelo aluno/);
assert.match(source, /Aluno marcou/);
assert.match(source, /Corrigir resposta/);
assert.match(source, /Adicionar uma observação \(opcional\)/);
assert.match(source, /aria-label="Resumo da correção"/);
assert.match(source, /role="progressbar"/);
assert.match(source, /Para revisar/);
assert.doesNotMatch(source, /Ver detalhes técnicos da leitura/);
assert.doesNotMatch(source, /Filtros de revisão/);
assert.doesNotMatch(source, /% de confiança/);
assert.doesNotMatch(source, /markedAnswers: index === 0/);
assert.match(source, /explicitlyReviewed: false,\s*markedAnswers: \[\]/);
assert.match(source, /detectedName: "",\s*identificationMethod: "manual",\s*matchedStudentId: ""/);
assert.match(source, /<option value="">Selecione o aluno<\/option>/);
assert.match(source, /const undecided = review\.answers\.some\(\(item\) => item\.explicitlyReviewed === false\)/);
assert.match(source, /const uncertainBlank = review\.answers\.some/);

console.log("Correction review simplicity checks passed.");
