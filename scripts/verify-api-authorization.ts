import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canAccessOperationalData, canAssignManagedRole, canManageTargetUser, managedRolesFor } from "../lib/access-control";

assert.equal(canAccessOperationalData("admin"), true);
assert.equal(canAccessOperationalData("vice_diretor"), true);
assert.equal(canAccessOperationalData("coordenador"), true);
assert.equal(canAccessOperationalData("professor"), false);
assert.equal(canAccessOperationalData("aluno"), false);
assert.equal(canAccessOperationalData("unknown-role"), false);

assert.deepEqual(managedRolesFor("admin"), ["professor", "coordenador", "vice_diretor", "admin"]);
assert.deepEqual(managedRolesFor("vice_diretor"), ["professor", "coordenador"]);
assert.equal(canAssignManagedRole("admin", "admin"), true);
assert.equal(canAssignManagedRole("vice_diretor", "professor"), true);
assert.equal(canAssignManagedRole("vice_diretor", "coordenador"), true);
assert.equal(canAssignManagedRole("vice_diretor", "vice_diretor"), false);
assert.equal(canAssignManagedRole("vice_diretor", "admin"), false);
assert.equal(canManageTargetUser("vice_diretor", "admin"), false);

const dashboardRoute = readFileSync(new URL("../app/api/dashboard/route.ts", import.meta.url), "utf8");
const operationalRoute = readFileSync(new URL("../app/api/app-data/route.ts", import.meta.url), "utf8");
assert.match(dashboardRoute, /canAccessOperationalData\(validation\.session\.role\)/);
assert.match(operationalRoute, /canAccessOperationalData\(validation\.session\.role\)/);

const usersRoute = readFileSync(new URL("../app/api/admin/users/route.ts", import.meta.url), "utf8");
const managedUserRoute = readFileSync(new URL("../app/api/admin/users/[userId]/route.ts", import.meta.url), "utf8");
assert.match(usersRoute, /canAssignManagedRole/);
assert.match(managedUserRoute, /canManageTargetUser/);

console.log("API authorization regression passed: operational data is denied to teachers and unknown roles.");
