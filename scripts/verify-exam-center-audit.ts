import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "components", "teacher-exams-workspace.tsx"), "utf8");
assert.match(source, /api\/teacher-exams\/\$\{encodeURIComponent\(exam\.id\)\}\/audit/);
assert.match(source, /Histórico da prova/);
assert.match(source, /teacher_exam_published: "Prova publicada"/);
assert.doesNotMatch(source, /<span[^>]*>\{entry\.event\}<\/span>/);
console.log("Exam Center audit verification passed.");
