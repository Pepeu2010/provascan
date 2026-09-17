import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canCreateExam } from "../lib/access-control";

assert.equal(canCreateExam("admin"), true);
assert.equal(canCreateExam("vice_diretor"), true);
assert.equal(canCreateExam("coordenador"), true);
assert.equal(canCreateExam("professor"), true);
assert.equal(canCreateExam("desconhecido"), false);

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const route = read("app/api/teacher-exams/route.ts");
const importRoute = read("app/api/teacher-exams/import/route.ts");
const itemRoute = read("app/api/teacher-exams/[examId]/route.ts");
const workspace = read("components/teacher-exams-workspace.tsx");
const css = read("components/teacher-exams-workspace.css");

assert.match(route, /capabilities:\s*\{\s*canCreateExam:/);
assert.match(route, /!session\?\.canCreateExam/);
assert.doesNotMatch(route, /session\.role !== "professor"/);
assert.match(importRoute, /!session\?\.canCreateExam/);
assert.match(itemRoute, /!session\?\.canCreateExam/);
assert.match(workspace, /ExamCreationActionsSkeleton/);
assert.match(workspace, /permissionsResolved/);
assert.match(workspace, /canCreateExam/);
assert.doesNotMatch(workspace, /setTimeout\(\(\) => void load\(\), 0\)/);
assert.match(css, /teacher-exams__command-actions/);
assert.match(css, /min-height:\s*48px/);

console.log("Exam creation permission stability checks passed.");
