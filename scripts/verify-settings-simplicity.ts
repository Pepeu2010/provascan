import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const settingsSource = readFileSync(resolve(process.cwd(), "components/management-workspace.tsx"), "utf8");
const administrationSource = readFileSync(resolve(process.cwd(), "components/administration-center.tsx"), "utf8");

for (const removedLabel of [
  "Persistência operacional",
  "Importação e restauração",
  "Gerar backup JSON",
  "Exportar resumo CSV",
  "Restaurar base inicial",
  "Importar backup",
  "Escolher arquivo JSON",
]) {
  assert.doesNotMatch(settingsSource, new RegExp(removedLabel));
}

assert.doesNotMatch(administrationSource, /Backup e restauração/);
assert.doesNotMatch(administrationSource, /href="#dados"/);

console.log("Settings simplicity checks passed.");
