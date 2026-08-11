import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canAccessOperationalData } from "../lib/access-control";

assert.equal(canAccessOperationalData("admin"), true);
assert.equal(canAccessOperationalData("vice_diretor"), true);
assert.equal(canAccessOperationalData("coordenador"), true);
assert.equal(canAccessOperationalData("professor"), false);
assert.equal(canAccessOperationalData("aluno"), false);
assert.equal(canAccessOperationalData("unknown-role"), false);

const dashboardRoute = readFileSync(new URL("../app/api/dashboard/route.ts", import.meta.url), "utf8");
const operationalRoute = readFileSync(new URL("../app/api/app-data/route.ts", import.meta.url), "utf8");
assert.match(dashboardRoute, /canAccessOperationalData\(validation\.session\.role\)/);
assert.match(operationalRoute, /canAccessOperationalData\(validation\.session\.role\)/);

console.log("API authorization regression passed: operational data is denied to teachers and unknown roles.");
