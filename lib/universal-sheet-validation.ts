/** Never silently discard detected rows or borrow rows from another student's sheet. */
export function groupCompleteSheetsWithSources<T>(pages: T[][], expectedQuestions: number): Array<{ firstPageIndex: number; rows: T[] }> {
  if (!Number.isInteger(expectedQuestions) || expectedQuestions < 1) {
    throw new Error("Confirme a quantidade de questões antes de corrigir.");
  }
  const sheets: Array<{ firstPageIndex: number; rows: T[] }> = [];
  let partial: T[] = [];
  let firstPageIndex = 0;
  for (const [index, rows] of pages.entries()) {
    if (rows.length > expectedQuestions) {
      throw new Error(`Página ${index + 1}: encontramos ${rows.length} linhas, mas a prova tem ${expectedQuestions} questões. Confira o modelo ou envie outra foto.`);
    }
    if (rows.length === expectedQuestions) {
      if (partial.length) throw new Error(`A folha anterior ficou incompleta: encontramos ${partial.length} de ${expectedQuestions} questões. Confira a ordem das páginas.`);
      sheets.push({ firstPageIndex: index, rows });
      continue;
    }
    if (!partial.length) firstPageIndex = index;
    if (partial.length + rows.length > expectedQuestions) {
      throw new Error(`As páginas reunidas têm ${partial.length + rows.length} linhas para uma prova de ${expectedQuestions} questões. Confira a ordem e o modelo.`);
    }
    partial = [...partial, ...rows];
    if (partial.length === expectedQuestions) {
      sheets.push({ firstPageIndex, rows: partial });
      partial = [];
    }
  }
  if (partial.length) throw new Error(`A última folha ficou incompleta: encontramos ${partial.length} de ${expectedQuestions} questões.`);
  if (!sheets.length) throw new Error("Nenhuma folha completa foi encontrada. Confira a foto ou o modelo.");
  return sheets;
}

export function groupCompleteSheets<T>(pages: T[][], expectedQuestions: number): T[][] {
  return groupCompleteSheetsWithSources(pages, expectedQuestions).map((sheet) => sheet.rows);
}

/** A score is a heuristic signal, not a calibrated probability of correctness. */
export function requiresManualMarkReview(mark: { confidence: number; status: string }, disputed: boolean) {
  return disputed || mark.status === "uncertain" || mark.status === "erasure_suspected"
    || mark.status === "multiple_marks" || mark.confidence < 0.75;
}
