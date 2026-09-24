import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canCorrectAssignedStudent, selectActiveAssignedExamClasses } from "../lib/assigned-exam-access";
import { getStudentsForExam } from "../lib/exam-audience";
import type { Exam, Student } from "../types/domain";

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const exams = [
  { id: "exam-public", subject_id: "math", status: "publicada" },
  { id: "exam-draft", subject_id: "math", status: "rascunho" },
  { id: "exam-free", subject_id: null, status: "aplicada" },
];
const assignments = [
  { exam_id: "exam-public", class_id: "class-a", active: true, archived_at: null },
  { exam_id: "exam-public", class_id: "class-b", active: true, archived_at: null },
  { exam_id: "exam-public", class_id: "class-d", active: true, archived_at: null },
  { exam_id: "exam-public", class_id: "class-c", active: false, archived_at: "2026-01-01" },
  { exam_id: "exam-public", class_id: "class-e", active: true, archived_at: "2026-01-02" },
  { exam_id: "exam-draft", class_id: "class-a", active: true, archived_at: null },
  { exam_id: "exam-free", class_id: "class-b", active: true, archived_at: null },
];
const scopes = [
  { class_id: "class-a", subject_id: "math", active: true, archived_at: null },
  { class_id: "class-b", subject_id: "history", active: true, archived_at: null },
  { class_id: "class-c", subject_id: "math", active: true, archived_at: null },
  { class_id: "class-d", subject_id: "math", active: true, archived_at: null },
  { class_id: "class-e", subject_id: "math", active: true, archived_at: null },
];
const allowed = selectActiveAssignedExamClasses(assignments, scopes, exams);
assert.deepEqual([...allowed.get("exam-public") ?? []], ["class-a", "class-d"]);
assert.deepEqual([...allowed.get("exam-free") ?? []], ["class-b"]);
assert.equal(allowed.has("exam-draft"), false);
assert.equal(canCorrectAssignedStudent(allowed.get("exam-public")!, "class-a"), true);
assert.equal(canCorrectAssignedStudent(allowed.get("exam-public")!, "class-b"), false);
assert.equal(selectActiveAssignedExamClasses(assignments, scopes.map((scope) => ({ ...scope, active: false })), exams).size, 0);

const students: Student[] = [
  { id: "a", nome: "A", turma: "class-a", status: "Ativo" },
  { id: "b", nome: "B", turma: "class-b", status: "Ativo" },
];
const exam = { id: "exam-public", audienceId: "other-year", groupType: "GERAL", yearSegment: "3", assignedClassIds: ["class-a"] } as Exam;
assert.deepEqual(getStudentsForExam(exam, students, []), [students[0]]);

const teacherExams = read("services/teacher-exams.ts");
const correctionRoute = read("app/api/corrections/route.ts");
const roster = read("services/exam-print-roster.ts");
assert.match(teacherExams, /allowAssignedRead\?: boolean/);
assert.match(teacherExams, /if \(!input\.allowAssignedRead/);
assert.match(correctionRoute, /getTeacherCorrectionAccess/);
assert.match(correctionRoute, /canCorrectAssignedStudent/);
assert.match(roster, /assignedTeacher/);
assert.match(roster, /!classIds\.length && !assignedTeacher/);
console.log("Assigned exam access: per-class scope, read-only detail, roster and correction checks passed.");
