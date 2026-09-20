import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const route = readFileSync(join(process.cwd(), "app", "api", "teacher-exams", "[examId]", "print-events", "route.ts"), "utf8");
const studio = readFileSync(join(process.cwd(), "components", "print-studio.tsx"), "utf8");
const center = readFileSync(join(process.cwd(), "components", "teacher-exams-workspace.tsx"), "utf8");
assert.match(route, /hasSameOriginRequest/);
assert.match(route, /getTeacherExam\(\{ actorId: session\.id, examId, institutionalView: session\.institutionalView \}\)/);
assert.match(route, /appendAuditEvent/);
assert.match(studio, /\/print-events/);
assert.match(studio, /recordPrintEvent\("cartoes_individuais"\)/);
assert.match(center, /teacher_exam_print_gabarito: "Gabarito oficial preparado"/);
console.log("Print audit verification passed.");
