import "server-only";
import { assertGoogleSheetsConfig, deletePrivateFiles, deleteRows, sheetsTable, updateRows, upsertRows, uploadPrivateFile } from "@/lib/google-sheets";

// The compatibility query API exposes schema-dependent row fields to existing services.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Result<T = Row[]> = { data: T; error: { message: string } | null; count: number };
type Order = { key: string; ascending: boolean; nullsFirst: boolean };

function compareValues(left: unknown, right: unknown) {
  if (left == null || left === "") return right == null || right === "" ? 0 : -1;
  if (right == null || right === "") return 1;
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), "pt-BR", { numeric: true, sensitivity: "base" });
}

class Query<TData = Row[]> implements PromiseLike<Result<TData>> {
  private readonly filters: Array<(row: Row) => boolean> = [];
  private readonly orders: Order[] = [];
  private projection = "*";
  private max = 500;
  private mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: Row | Row[] = {};
  private one: "maybe" | "single" | null = null;
  private conflictKeys = ["id"];
  private ignoreDuplicates = false;

  constructor(private readonly table: string) {}

  select(columns = "*", options?: unknown) { void options; this.projection = columns; return this; }
  eq(key: string, value: unknown) { this.filters.push((row) => String(row[key] ?? "") === String(value ?? "")); return this; }
  neq(key: string, value: unknown) { this.filters.push((row) => String(row[key] ?? "") !== String(value ?? "")); return this; }
  in(key: string, values: unknown[]) { const expected = new Set(values.map(String)); this.filters.push((row) => expected.has(String(row[key] ?? ""))); return this; }
  is(key: string, value: unknown) { this.filters.push((row) => value === null ? row[key] == null || row[key] === "" : row[key] === value); return this; }
  lt(key: string, value: unknown) { this.filters.push((row) => compareValues(row[key], value) < 0); return this; }
  order(key: string, options?: { ascending?: boolean; nullsFirst?: boolean }) { this.orders.push({ key, ascending: options?.ascending ?? true, nullsFirst: options?.nullsFirst ?? false }); return this; }
  limit(value: number) { this.max = Math.max(0, value); return this; }
  maybeSingle() { this.one = "maybe"; return this as unknown as Query<Row | null>; }
  single() { this.one = "single"; return this as unknown as Query<Row | null>; }
  insert(payload: Row | Row[], options?: unknown) { void options; this.mode = "insert"; this.payload = payload; return this; }
  update(payload: Row) { this.mode = "update"; this.payload = payload; return this; }
  delete() { this.mode = "delete"; return this; }
  upsert(payload: Row | Row[], options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.mode = "upsert";
    this.payload = payload;
    this.conflictKeys = options?.onConflict?.split(",").map((key) => key.trim()).filter(Boolean) ?? ["id"];
    this.ignoreDuplicates = options?.ignoreDuplicates ?? false;
    return this;
  }

  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result<TData>) => TResult1 | PromiseLike<TResult1>) | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<Result<TData>> {
    try {
      const table = await sheetsTable(this.table);
      const rows = table.all();
      let selected = rows.filter((row) => this.filters.every((filter) => filter(row)));
      for (const order of [...this.orders].reverse()) {
        selected = [...selected].sort((left, right) => {
          const leftNull = left[order.key] == null || left[order.key] === "";
          const rightNull = right[order.key] == null || right[order.key] === "";
          if (leftNull || rightNull) return leftNull === rightNull ? 0 : (leftNull === order.nullsFirst ? -1 : 1);
          const result = compareValues(left[order.key], right[order.key]);
          return order.ascending ? result : -result;
        });
      }

      let data: unknown;
      if (this.mode === "insert") {
        const toInsert = Array.isArray(this.payload) ? this.payload : [this.payload];
        await table.append(toInsert);
        data = toInsert;
        selected = toInsert;
      } else if (this.mode === "update") {
        await updateRows(this.table, (row) => this.filters.every((filter) => filter(row)), this.payload as Row);
        data = selected.map((row) => ({ ...row, ...(this.payload as Row) }));
      } else if (this.mode === "delete") {
        await deleteRows(this.table, (row) => this.filters.every((filter) => filter(row)));
        data = selected;
      } else if (this.mode === "upsert") {
        const incoming = Array.isArray(this.payload) ? this.payload : [this.payload];
        const returned = await upsertRows(this.table, incoming, this.conflictKeys, this.ignoreDuplicates);
        data = returned;
        selected = returned;
      } else {
        data = selected.slice(0, this.max).map((row) => this.projection === "*" ? row : Object.fromEntries(this.projection.split(",").map((key) => [key.trim(), row[key.trim()]])));
      }

      if (this.one) {
        const values = Array.isArray(data) ? data : data == null ? [] : [data];
        if (this.one === "single" && values.length !== 1) return { data: null as TData, error: { message: "Esperava exatamente uma linha." }, count: values.length };
        data = values[0] ?? null;
      }
      return { data: data as TData, error: null, count: selected.length };
    } catch (error) {
      return { data: null as TData, error: { message: error instanceof Error ? error.message : "Erro ao acessar o Google Sheets." }, count: 0 };
    }
  }
}

const storage = {
  from: (bucket: string) => {
    void bucket;
    return {
    upload: async (name: string, bytes: Uint8Array, options: { contentType?: string; cacheControl?: string; upsert?: boolean }) => {
      try { return { data: { path: await uploadPrivateFile(name, bytes, options.contentType || "application/octet-stream") }, error: null }; }
      catch (error) { return { data: null, error: { message: error instanceof Error ? error.message : "Erro no Google Drive." } }; }
    },
    remove: async (fileIds: string[]) => {
      try { await deletePrivateFiles(fileIds); return { data: fileIds.map((id) => ({ id })), error: null }; }
      catch (error) { return { data: null, error: { message: error instanceof Error ? error.message : "Erro no Google Drive." } }; }
    },
    };
  },
};

export function createSheetsClient() {
  assertGoogleSheetsConfig();
  return { from: (table: string) => new Query<Row[]>(table), storage };
}
