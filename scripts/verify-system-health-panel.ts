import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const workspace = readFileSync(join(process.cwd(), "components", "management-workspace.tsx"), "utf8");
const route = readFileSync(join(process.cwd(), "app", "api", "dashboard", "route.ts"), "utf8");
assert.match(workspace, /function SystemHealthPanel/);
assert.match(workspace, /Estado do sistema/);
assert.match(workspace, /fetch\("\/api\/dashboard"/);
assert.match(workspace, /Banco conectado/);
assert.match(route, /getSystemSnapshot\(\)/);
console.log("System health panel verification passed.");
