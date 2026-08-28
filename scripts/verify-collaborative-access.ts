import assert from "node:assert/strict";
import { canAccessPath, isAcademicManagementRole } from "../lib/access-control";

assert.equal(isAcademicManagementRole("coordenador"), true);
assert.equal(isAcademicManagementRole("professor"), false);
assert.equal(canAccessPath("professor", "/dashboard/minhas-provas"), true);
assert.equal(canAccessPath("professor", "/dashboard/provas"), false);
assert.equal(canAccessPath("professor", "/dashboard/correcao"), true);
assert.equal(canAccessPath("coordenador", "/dashboard/provas"), true);
assert.equal(canAccessPath("coordenador", "/dashboard/configuracoes"), false);
assert.equal(canAccessPath("vice_diretor", "/dashboard/configuracoes"), true);
console.log("Collaborative exam access checks passed.");
