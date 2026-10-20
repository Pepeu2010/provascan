type GoogleSheetsValueRange = { values?: unknown[][] | null };

type PendingRead<T> = {
  queued: boolean;
  resolve: Array<(value: T) => void>;
  reject: Array<(error: unknown) => void>;
};

/** Coalesce concurrent reads in one server process into a single Sheets batchGet. */
export function createGoogleSheetsReadBatcher<T>(readBatch: (tables: string[]) => Promise<Map<string, T>>) {
  const pending = new Map<string, PendingRead<T>>();
  let flushScheduled = false;

  const scheduleFlush = () => {
    if (flushScheduled) return;
    flushScheduled = true;
    queueMicrotask(() => {
      flushScheduled = false;
      const batch = [...pending.entries()].filter(([, request]) => request.queued);
      if (!batch.length) return;
      batch.forEach(([, request]) => { request.queued = false; });
      void readBatch(batch.map(([table]) => table)).then((results) => {
        for (const [table, request] of batch) {
          if (pending.get(table) !== request) continue;
          pending.delete(table);
          const result = results.get(table);
          if (result === undefined) request.reject.forEach((reject) => reject(new Error(`A aba ${table} não foi retornada pelo batchGet.`)));
          else request.resolve.forEach((resolve) => resolve(result));
        }
      }).catch((error: unknown) => {
        for (const [table, request] of batch) {
          if (pending.get(table) !== request) continue;
          pending.delete(table);
          request.reject.forEach((reject) => reject(error));
        }
      }).finally(() => {
        if ([...pending.values()].some((request) => request.queued)) scheduleFlush();
      });
    });
  };

  return (table: string): Promise<T> => new Promise((resolve, reject) => {
    const existing = pending.get(table);
    if (existing) {
      existing.resolve.push(resolve);
      existing.reject.push(reject);
      return;
    }
    pending.set(table, { queued: true, resolve: [resolve], reject: [reject] });
    scheduleFlush();
  });
}

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
