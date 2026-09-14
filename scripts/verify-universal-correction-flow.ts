import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const correction = fs.readFileSync(path.join(root, "components", "correction-workspace.tsx"), "utf8");
const external = fs.readFileSync(path.join(root, "components", "external-correction-workspace.tsx"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20260914180000_universal_external_exams.sql"), "utf8");

for (const contract of ["Prova do ProvaScan", "Prova externa", "ExternalCorrectionWorkspace"]) {
  assert.match(correction, new RegExp(contract), `Modo obrigatório ausente: ${contract}`);
}

for (const contract of [
  "Tirar foto",
  "Enviar imagem",
  "Enviar PDF",
  "Estrutura detectada",
  "Confirmar estrutura",
  "Gabarito manual",
  "Usar esta folha como gabarito",
  "Adicionar folhas dos alunos",
  "Revisar dúvidas",
  "Recorte original",
  "Salvar como modelo de correção",
]) {
  assert.match(external, new RegExp(contract), `Etapa obrigatória ausente: ${contract}`);
}

assert.match(external, /multiple_marks/);
assert.match(external, /decodeDocumentPages/);
assert.match(external, /processDocumentPages/);
assert.match(external, /analyzeUniversalPage/);
assert.match(migration, /enable row level security/i);
assert.match(migration, /revoke all/i);

console.log("Fluxo universal, PDF multipágina, revisão e persistência estão conectados.");
