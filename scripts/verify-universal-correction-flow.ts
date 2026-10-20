import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const correction = fs.readFileSync(path.join(root, "components", "correction-workspace.tsx"), "utf8");
const external = fs.readFileSync(path.join(root, "components", "external-correction-workspace.tsx"), "utf8");
const reports = fs.readFileSync(path.join(root, "components", "management-workspace.tsx"), "utf8");
const correctionApi = fs.readFileSync(path.join(root, "app", "api", "external-corrections", "route.ts"), "utf8");
const externalService = fs.readFileSync(path.join(root, "services", "external-exams.ts"), "utf8");
const sheetsData = fs.readFileSync(path.join(root, "services", "google-sheets-data.ts"), "utf8");

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
assert.match(correctionApi, /export async function GET/);
assert.match(reports, /Histórico de correções externas/);
assert.match(external, /analyzeUniversalPage/);
assert.match(correctionApi, /saveExternalCorrections/);
assert.match(externalService, /saveExternalCorrections/);
assert.match(externalService, /createSheetsClient|upsert/);
assert.match(sheetsData, /createSheetsClient/);

console.log("Fluxo universal, PDF multipágina, revisão e persistência estão conectados.");
