import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync(new URL("../app/api/admin/operational-export/route.ts", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../components/management-workspace.tsx", import.meta.url), "utf8");

assert.match(route, /hasSameOriginRequest/);
assert.match(route, /canManageUsers/);
assert.match(route, /consumeRateLimit/);
assert.match(route, /getOperationalSnapshot/);
assert.match(route, /operational_data_exported/);
assert.match(route, /Não contém senhas, segredos MFA ou arquivos de imagem/);
assert.match(route, /Content-Disposition/);
assert.match(workspace, /function OperationalExportPanel/);
assert.match(workspace, /Exportação institucional/);
assert.match(workspace, /\/api\/admin\/operational-export/);
assert.match(workspace, /Guarde o arquivo em local seguro/);

console.log("Operational export checks passed.");
