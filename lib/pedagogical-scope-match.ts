export type ScopeMatch = {
  active: boolean;
  archived_at: string | null;
  class_id: string;
  subject_id: string | null;
};

/** Class-only grants cover free-text exams, never a different registered subject. */
export function scopeAllowsExam(scope: ScopeMatch, classId: string, subjectId: string | null) {
  return scope.active && !scope.archived_at && scope.class_id === classId &&
    (!subjectId || scope.subject_id === subjectId);
}
