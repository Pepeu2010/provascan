export type ReviewAuditEntry = { question: number; before: string[]; after: string[] };

export function formatReviewAudit(entries: ReviewAuditEntry[] = []): string[] {
  return entries.map(({ question, before, after }) =>
    `Conferência manual Q${question}: ${before.join("+") || "em branco"} → ${after.join("+") || "em branco"}`,
  );
}
