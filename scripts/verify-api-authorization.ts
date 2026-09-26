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
assert.deepEqual(managedRolesFor("vice_diretor"), []);
assert.equal(canAssignManagedRole("admin", "admin"), true);
assert.equal(canAssignManagedRole("vice_diretor", "professor"), false);
assert.equal(canAssignManagedRole("vice_diretor", "coordenador"), false);
assert.equal(canAssignManagedRole("vice_diretor", "vice_diretor"), false);
assert.equal(canAssignManagedRole("vice_diretor", "admin"), false);
assert.equal(canManageTargetUser("vice_diretor", "admin"), false);
assert.equal(canAccessPath("vice_diretor", "/admin"), false);
assert.equal(canAccessPath("vice_diretor", "/painel"), false);
assert.equal(canAccessPath("vice_diretor", "/dashboard/configuracoes"), false);
assert.equal(canAccessPath("admin", "/dashboard/configuracoes"), true);
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
const printRosterRoute = readFileSync(new URL("../app/api/teacher-exams/[examId]/print-roster/route.ts", import.meta.url), "utf8");
const printRosterService = readFileSync(new URL("../services/exam-print-roster.ts", import.meta.url), "utf8");
assert.match(usersRoute, /canAssignManagedRole/);
assert.match(managedUserRoute, /canManageTargetUser/);
assert.match(managedUserRoute, /export async function DELETE/);
assert.match(managedUserRoute, /setManagedUserTemporaryPassword/);
assert.match(correctionsRoute, /getTeacherCorrectionAccess/);
assert.match(correctionsRoute, /canCorrectAssignedStudent/);
assert.match(correctionsRoute, /getExamPrintRoster/);
assert.match(printRosterRoute, /getExamSession/);
assert.match(printRosterRoute, /getExamPrintRoster/);
assert.match(printRosterService, /getTeacherExam\(\{ \.\.\.input, allowAssignedRead: true \}\)/);
assert.match(printRosterService, /assignedTeacher/);
assert.match(printRosterService, /exam_assignments/);
assert.match(printRosterService, /IDs de\s+\* aluno enviados pelo navegador nunca definem/);

console.log("API authorization regression passed: teachers receive scoped data and unknown roles remain denied.");
