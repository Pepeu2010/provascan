import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canAssignPair, expandAssignmentGroups } from "../lib/exam-assignment-policy";

assert.deepEqual(expandAssignmentGroups([{ teacherId: "p1", classIds: ["a", "b"] }, { teacherId: "p2", classIds: ["c"] }]), [{ teacherId: "p1", classId: "a" }, { teacherId: "p1", classId: "b" }, { teacherId: "p2", classId: "c" }]);
assert.equal(canAssignPair({ actorId: "p1", actorRole: "professor", destinationTeacherId: "p1", hasScope: true, destinationHasScope: true, scopeException: false }), true);
assert.equal(canAssignPair({ actorId: "p1", actorRole: "professor", destinationTeacherId: "p2", hasScope: true, destinationHasScope: true, scopeException: false }), false);
assert.equal(canAssignPair({ actorId: "c1", actorRole: "coordenador", destinationTeacherId: "p2", hasScope: false, destinationHasScope: true, scopeException: false }), false);
assert.equal(canAssignPair({ actorId: "v1", actorRole: "vice_diretor", destinationTeacherId: "p2", hasScope: false, destinationHasScope: true, scopeException: false }), true);
assert.equal(canAssignPair({ actorId: "a1", actorRole: "admin", destinationTeacherId: "p2", hasScope: false, destinationHasScope: false, scopeException: true }), true);

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const route = read("app/api/teacher-exams/[examId]/assignments/route.ts");
const service = read("services/exam-assignments.ts");
assert.match(route, /groups: z\.array/);
assert.doesNotMatch(route, /teacherIds/);
assert.match(service, /não pode alterar atribuições de uma prova de outro professor/);
assert.match(service, /não pode inativar uma atribuição fora do seu escopo pedagógico/);
assert.match(service, /exam_assignments/);
console.log("Exam assignment contracts passed.");
