import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canAccessOperationalData, canAccessPath, canAssignManagedRole, canManageTargetUser, managedRolesFor } from "../lib/access-control";
import { compareClassrooms } from "../lib/education-labels";

assert.equal(canAccessOperationalData("admin"), true);
assert.equal(canAccessOperationalData("vice_diretor"), true);
assert.equal(canAccessOperationalData("coordenador"), true);
assert.equal(canAccessOperationalData("professor"), false);
assert.equal(canAccessOperationalData("aluno"), false);
assert.equal(canAccessOperationalData("unknown-role"), false);

assert.deepEqual(managedRolesFor("admin"), ["professor", "coordenador", "vice_diretor", "admin"]);
assert.deepEqual(managedRolesFor("vice_diretor"), ["professor", "coordenador", "vice_diretor", "admin"]);
assert.equal(canAssignManagedRole("admin", "admin"), true);
assert.equal(canAssignManagedRole("vice_diretor", "professor"), true);
assert.equal(canAssignManagedRole("vice_diretor", "coordenador"), true);
assert.equal(canAssignManagedRole("vice_diretor", "vice_diretor"), true);
assert.equal(canAssignManagedRole("vice_diretor", "admin"), true);
assert.equal(canManageTargetUser("vice_diretor", "admin"), true);
assert.equal(canAccessPath("vice_diretor", "/admin"), true);
assert.equal(canAccessPath("vice_diretor", "/painel"), true);
assert.equal(canAccessPath("professor", "/dashboard/correcao"), true);
assert.equal(canAccessPath("professor", "/dashboard/alunos"), false);

const orderedClassNames = ["3E", "1C", "2A", "1A", "2C", "1B", "3A"].sort((left, right) => compareClassrooms({ nome: left }, { nome: right }));
assert.deepEqual(orderedClassNames, ["1A", "1B", "1C", "2A", "2C", "3A", "3E"]);

const dashboardRoute = readFileSync(new URL("../app/api/dashboard/route.ts", import.meta.url), "utf8");
const operationalRoute = readFileSync(new URL("../app/api/app-data/route.ts", import.meta.url), "utf8");
assert.match(dashboardRoute, /canAccessOperationalData\(validation\.session\.role\)/);
assert.match(operationalRoute, /canAccessOperationalData\(validation\.session\.role\)/);

const usersRoute = readFileSync(new URL("../app/api/admin/users/route.ts", import.meta.url), "utf8");
const managedUserRoute = readFileSync(new URL("../app/api/admin/users/[userId]/route.ts", import.meta.url), "utf8");
const correctionsRoute = readFileSync(new URL("../app/api/corrections/route.ts", import.meta.url), "utf8");
assert.match(usersRoute, /canAssignManagedRole/);
assert.match(managedUserRoute, /canManageTargetUser/);
assert.match(managedUserRoute, /export async function DELETE/);
assert.match(managedUserRoute, /setManagedUserTemporaryPassword/);
assert.match(correctionsRoute, /teacherCanCorrectExam/);
assert.match(correctionsRoute, /getStudentsForExam/);

console.log("API authorization regression passed: operational data is denied to teachers and unknown roles.");
