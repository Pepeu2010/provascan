type QueryError = { message?: string } | null;
type QueryResult<T> = { data: T | null; error: QueryError };

export function isMissingTeacherExamSchema(error: QueryError) {
  if (!error?.message) return false;
  return /column (?:exams\.)?(?:status|creator_id|applied_at) does not exist/i.test(error.message);
}

export function isMissingExamQuestionTopicSchema(error: QueryError) {
  if (!error?.message) return false;
  return /column (?:exam_questions\.)?topic does not exist|could not find the ['"]topic['"] column of ['"]exam_questions['"]/i.test(error.message);
}

export async function withTeacherExamSchemaFallback<TModern, TLegacy = TModern>(
  modernQuery: () => Promise<QueryResult<TModern>>,
  legacyQuery: () => Promise<QueryResult<TLegacy>>,
): Promise<QueryResult<TModern | TLegacy>> {
  const result = await modernQuery();
  return isMissingTeacherExamSchema(result.error) ? legacyQuery() : result;
}

export async function withExamQuestionTopicFallback<TModern, TLegacy = TModern>(
  modernQuery: () => Promise<QueryResult<TModern>>,
  legacyQuery: () => Promise<QueryResult<TLegacy>>,
): Promise<QueryResult<TModern | TLegacy>> {
  const result = await modernQuery();
  return isMissingExamQuestionTopicSchema(result.error) ? legacyQuery() : result;
}
