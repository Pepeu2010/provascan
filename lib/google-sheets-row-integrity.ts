export type GoogleSheetsRow = Record<string, unknown>;

export class GoogleSheetsConstraintError extends Error {}

function keyFor(row: GoogleSheetsRow, conflictKeys: string[], table: string): string {
  if (!conflictKeys.length) throw new GoogleSheetsConstraintError(`A tabela ${table} precisa de uma chave de conflito.`);
  const values = conflictKeys.map((key) => {
    if (!Object.hasOwn(row, key) || row[key] === undefined || row[key] === null) {
      throw new GoogleSheetsConstraintError(`A tabela ${table} recebeu uma linha sem a chave ${key}.`);
    }
    return row[key];
  });
  return JSON.stringify(values);
}

export function assertUniqueGoogleSheetsKeys(rows: GoogleSheetsRow[], conflictKeys: string[], table: string): void {
  const seen = new Set<string>();
  for (const row of rows) {
    const key = keyFor(row, conflictKeys, table);
    if (seen.has(key)) throw new GoogleSheetsConstraintError(`Chave duplicada na tabela ${table}.`);
    seen.add(key);
  }
}

export function mergeGoogleSheetsUpsert(
  current: GoogleSheetsRow[],
  incoming: GoogleSheetsRow[],
  conflictKeys: string[],
  ignoreDuplicates: boolean,
  table: string,
): GoogleSheetsRow[] {
  assertUniqueGoogleSheetsKeys(current, conflictKeys, table);
  if (!ignoreDuplicates) assertUniqueGoogleSheetsKeys(incoming, conflictKeys, table);
  const next = current.map((row) => ({ ...row }));
  const indexes = new Map<string, number>();
  next.forEach((row, index) => indexes.set(keyFor(row, conflictKeys, table), index));

  for (const row of incoming) {
    const key = keyFor(row, conflictKeys, table);
    const index = indexes.get(key);
    if (index === undefined) {
      indexes.set(key, next.length);
      next.push({ ...row });
      continue;
    }
    if (!ignoreDuplicates) next[index] = { ...next[index], ...row };
  }

  assertUniqueGoogleSheetsKeys(next, conflictKeys, table);
  return next;
}
