import { scopeAllowsExam, type ScopeMatch } from "@/lib/pedagogical-scope-match";

export type RosterClass = { audienceId: string; id: string; yearSegment: string };

/** A legacy exam may say GERAL while still naming one concrete class. A
 * concrete audience always wins over the year; missing metadata grants none. */
export function selectLegacyRosterClassIds(
  exam: { audienceId: string; groupType: string; yearSegment: string },
  classes: RosterClass[],
) {
  const audienceId = exam.audienceId.trim().toLocaleLowerCase("pt-BR");
  const exact = audienceId
    ? classes.filter((item) => item.id.trim().toLocaleLowerCase("pt-BR") === audienceId)
    : [];
  if (exact.length) return exact.map((item) => item.id);
  const matchingAudience = audienceId
    ? classes.filter((item) => item.audienceId.trim().toLocaleLowerCase("pt-BR") === audienceId)
    : [];
  if (matchingAudience.length) return matchingAudience.map((item) => item.id);
  if (exam.groupType === "TURMA" || audienceId.startsWith("turma-")) return [];
  const year = exam.yearSegment.trim();
  if (!year || year === "OUTROS") return [];
  return classes.filter((item) => item.yearSegment === year).map((item) => item.id);
}

/** A teacher's authorship of an exam does not grant access to every pupil in
 * its year. Only active pedagogical scopes can expose students in the roster. */
export function restrictRosterClassIds(classIds: string[], allowedClassIds: ReadonlySet<string> | null) {
  const unique = [...new Set(classIds)];
  return allowedClassIds ? unique.filter((id) => allowedClassIds.has(id)) : unique;
}

/** A teacher's correction audience must use the same explicit class and active
 * scope rules as the printable roster. Authorship alone is not student access. */
export function selectTeacherCorrectionClassIds(
  exam: { audienceId: string; groupType: string; yearSegment: string; subjectId?: string | null },
  classes: RosterClass[],
  assignedClassIds: string[],
  scopes: ScopeMatch[],
) {
  const candidateIds = assignedClassIds.length ? assignedClassIds : selectLegacyRosterClassIds(exam, classes);
  const allowed = new Set(scopes
    .filter((scope) => scopeAllowsExam(scope, scope.class_id, exam.subjectId ?? null))
    .map((scope) => scope.class_id));
  return new Set(restrictRosterClassIds(candidateIds, allowed));
}
