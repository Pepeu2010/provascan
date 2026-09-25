import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { restrictRosterClassIds, selectLegacyRosterClassIds } from "../lib/exam-roster-scope";

const classes = [
  { audienceId: "TURMA-1A", id: "class-1a", yearSegment: "1" },
  { audienceId: "TURMA-1B", id: "class-1b", yearSegment: "1" },
  { audienceId: "TURMA-2A", id: "class-2a", yearSegment: "2" },
];

assert.deepEqual(selectLegacyRosterClassIds({ audienceId: "TURMA-1a", groupType: "GERAL", yearSegment: "1" }, classes), ["class-1a"]);
assert.deepEqual(selectLegacyRosterClassIds({ audienceId: "ANO-1-GERAL", groupType: "GERAL", yearSegment: "1" }, classes), ["class-1a", "class-1b"]);
assert.deepEqual(selectLegacyRosterClassIds({ audienceId: "TURMA-9A", groupType: "GERAL", yearSegment: "1" }, classes), []);
assert.deepEqual(selectLegacyRosterClassIds({ audienceId: "", groupType: "GERAL", yearSegment: "" }, classes), []);
assert.deepEqual(restrictRosterClassIds(["class-1a", "class-1b"], new Set(["class-1a"])), ["class-1a"]);
assert.deepEqual(restrictRosterClassIds(["class-1a"], new Set()), []);
assert.deepEqual(restrictRosterClassIds(["class-1a", "class-1a"], null), ["class-1a"]);

const service = readFileSync(new URL("../services/exam-print-roster.ts", import.meta.url), "utf8");
assert.match(service, /selectLegacyRosterClassIds\(exam,/);
assert.match(service, /\.from\("pedagogical_scopes"\)/);
assert.match(service, /restrictRosterClassIds\(classIds, allowed\)/);
assert.match(service, /\.in\("class_id", classIds\)/);

console.log("Exam roster scope: exact class, whole-year, inactive/missing scope and fail-closed legacy paths verified.");
