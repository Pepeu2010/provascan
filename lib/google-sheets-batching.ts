type GoogleSheetsValueRange = { values?: unknown[][] | null };

/** Read several tabs in one Sheets API request and decode each response range. */
export async function readGoogleSheetsTableBatch<T>(
  tables: string[],
  batchGet: (ranges: string[]) => Promise<GoogleSheetsValueRange[]>,
  decode: (table: string, values: unknown[][]) => T,
): Promise<Map<string, T>> {
  const uniqueTables = [...new Set(tables)];
  if (!uniqueTables.length) return new Map();

  const ranges = uniqueTables.map((table) => `'${table.replace(/'/g, "''")}'`);
  const valueRanges = await batchGet(ranges);
  return new Map(uniqueTables.map((table, index) => [table, decode(table, valueRanges[index]?.values ?? [])]));
}
