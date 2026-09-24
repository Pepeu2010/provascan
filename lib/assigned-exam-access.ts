export type AssignedExamRow = { exam_id: string; class_id: string; active: boolean; archived_at: string | null };
export type AssignedScopeRow = { class_id: string; subject_id: string; active: boolean; archived_at: string | null };
export type AssignedExamDetails = { id: string; subject_id: string | null; status: string };

/** An assignment grants access only to its concrete class, while both the
 * assignment and the teacher's corresponding pedagogical scope remain active. */
export function selectActiveAssignedExamClasses(
  assignments: AssignedExamRow[],
  scopes: AssignedScopeRow[],
  exams: AssignedExamDetails[],
) {
  const examById = new Map(exams.map((exam) => [exam.id, exam]));
  const allowed = new Map<string, Set<string>>();
  for (const assignment of assignments) {
    if (!assignment.active || assignment.archived_at) continue;
    const exam = examById.get(assignment.exam_id);
    if (!exam || (exam.status !== "publicada" && exam.status !== "aplicada")) continue;
    if (!scopes.some((scope) => scope.active && !scope.archived_at && scope.class_id === assignment.class_id && (!exam.subject_id || scope.subject_id === exam.subject_id))) continue;
    const classIds = allowed.get(exam.id) ?? new Set<string>();
    classIds.add(assignment.class_id);
    allowed.set(exam.id, classIds);
  }
  return allowed;
}

export function canCorrectAssignedStudent(classIds: ReadonlySet<string>, studentClassId: string) {
  return classIds.has(studentClassId);
}
