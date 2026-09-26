import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { restrictRosterClassIds, selectLegacyRosterClassIds, selectTeacherCorrectionClassIds } from "../lib/exam-roster-scope";

const classes = [
  { audienceId: "TURMA-1A", id: "class-1a", yearSegment: "1" },
  { audienceId: "TURMA-1B", id: "class-1b", yearSegment: "1" },
  { audienceId: "TURMA-2A", id: "class-2a", yearSegment: "2" },
];

assert.deepEqual(selectLegacyRosterClassIds({ audienceId: "TURMA-1a", groupType: "GERAL", yearSegment: "1" }, classes), ["class-1a"]);
assert.deepEqual(selectLegacyRosterClassIds({ audienceId: "TURMA-1a", groupType: "GERAL", yearSegment: "1" }, [
  { audienceId: "ANO-1-GERAL", id: "TURMA-1a", yearSegment: "1" },
  { audienceId: "ANO-1-GERAL", id: "TURMA-1b", yearSegment: "1" },
]), ["TURMA-1a"]);
assert.deepEqual(selectLegacyRosterClassIds({ audienceId: "ANO-1-GERAL", groupType: "GERAL", yearSegment: "1" }, classes), ["class-1a", "class-1b"]);
assert.deepEqual(selectLegacyRosterClassIds({ audienceId: "TURMA-9A", groupType: "GERAL", yearSegment: "1" }, classes), []);
assert.deepEqual(selectLegacyRosterClassIds({ audienceId: "", groupType: "GERAL", yearSegment: "" }, classes), []);
assert.deepEqual(restrictRosterClassIds(["class-1a", "class-1b"], new Set(["class-1a"])), ["class-1a"]);
assert.deepEqual(restrictRosterClassIds(["class-1a"], new Set()), []);
assert.deepEqual(restrictRosterClassIds(["class-1a", "class-1a"], null), ["class-1a"]);
const activeScope = { active: true, archived_at: null, class_id: "class-1a", subject_id: null };
const concreteExam = { audienceId: "TURMA-1a", groupType: "GERAL", yearSegment: "1", subjectId: null };
assert.deepEqual([...selectTeacherCorrectionClassIds(concreteExam, classes, [], [activeScope])], ["class-1a"]);
assert.deepEqual([...selectTeacherCorrectionClassIds(concreteExam, [
  { audienceId: "ANO-1-GERAL", id: "TURMA-1a", yearSegment: "1" },
  { audienceId: "ANO-1-GERAL", id: "TURMA-1b", yearSegment: "1" },
], [], [{ ...activeScope, class_id: "TURMA-1a" }])], ["TURMA-1a"]);
assert.deepEqual([...selectTeacherCorrectionClassIds(concreteExam, classes, [], [])], []);
assert.deepEqual([...selectTeacherCorrectionClassIds({ ...concreteExam, audienceId: "ANO-1-GERAL" }, classes, [], [activeScope])], ["class-1a"]);
assert.deepEqual([...selectTeacherCorrectionClassIds(concreteExam, classes, ["class-1b"], [activeScope])], []);
assert.deepEqual([...selectTeacherCorrectionClassIds(concreteExam, classes, [], [{ ...activeScope, active: false }])], []);
assert.deepEqual([...selectTeacherCorrectionClassIds({ ...concreteExam, subjectId: "math" }, classes, [], [activeScope])], []);

const service = readFileSync(new URL("../services/exam-print-roster.ts", import.meta.url), "utf8");
assert.match(service, /selectLegacyRosterClassIds\(exam,/);
assert.match(service, /\.from\("pedagogical_scopes"\)/);
assert.match(service, /restrictRosterClassIds\(classIds, allowed\)/);
assert.match(service, /\.in\("class_id", classIds\)/);
const correctionService = readFileSync(new URL("../services/supabase-data.ts", import.meta.url), "utf8");
assert.match(correctionService, /selectTeacherCorrectionClassIds/);
assert.match(correctionService, /corrections: snapshot\.data\.corrections\.filter\([\s\S]*allowedClassesByExam/);
assert.doesNotMatch(correctionService, /if \(exam\) return \{ classIds: null \}/);

console.log("Exam roster scope: exact class, whole-year, inactive/missing scope and fail-closed legacy paths verified.");
