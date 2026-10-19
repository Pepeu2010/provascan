import "server-only";
import { deleteRows, sheetsTable, updateRows } from "@/lib/google-sheets";
type Row = Record<string, any>;
type Result = { data: any; error: { message: string; code?: string } | null; count?: number };
class Query implements PromiseLike<Result> {
  private filters: Array<(row: Row) => boolean> = [];
  private projection = "*"; private max = 500; private mode = "select"; private payload: Row | Row[] = {}; private one = false;
  constructor(private readonly table: string) {}
  select(columns = "*", _options?: any) { this.projection = columns; return this; }
  eq(k: string, v: any) { this.filters.push((r) => String(r[k] ?? "") === String(v)); return this; }
  neq(k: string, v: any) { this.filters.push((r) => String(r[k] ?? "") !== String(v)); return this; }
  in(k: string, values: any[]) { this.filters.push((r) => values.map(String).includes(String(r[k] ?? ""))); return this; }
  is(k: string, v: any) { this.filters.push((r) => v === null ? r[k] == null || r[k] === "" : r[k] === v); return this; }
  lt(k: string, v: any) { this.filters.push((r) => String(r[k] ?? "") < String(v)); return this; }
  order(_k: string, _o?: any) { return this; }
  limit(v: number) { this.max = v; return this; }
  maybeSingle() { this.one = true; return this; }
  single() { this.one = true; return this; }
  insert(p: Row | Row[], _o?: any) { this.mode = "insert"; this.payload = p; return this; }
  update(p: Row) { this.mode = "update"; this.payload = p; return this; }
  delete() { this.mode = "delete"; return this; }
  upsert(p: Row | Row[], _o?: any) { this.mode = "upsert"; this.payload = p; return this; }
  async then(resolve: (v: Result) => any, reject?: (e: any) => any) { try { const t = await sheetsTable(this.table); const rows = t.all(); const selected = rows.filter((r) => this.filters.every((f) => f(r))); let data: any; if (this.mode === "insert") { data = Array.isArray(this.payload) ? this.payload : [this.payload]; await t.append(data); } else if (this.mode === "update") { await updateRows(this.table, (r) => this.filters.every((f) => f(r)), this.payload as Row); data = selected.map((r) => ({ ...r, ...(this.payload as Row) })); } else if (this.mode === "delete") { await deleteRows(this.table, (r) => this.filters.every((f) => f(r))); data = selected; } else if (this.mode === "upsert") { data = Array.isArray(this.payload) ? this.payload : [this.payload]; for (const item of data) { const id = item.id == null ? null : String(item.id); if (id && rows.some((r) => String(r.id) === id)) await updateRows(this.table, (r) => String(r.id) === id, item); else await t.append([item]); } } else { const out = selected.slice(0, this.max).map((r) => this.projection === "*" ? r : Object.fromEntries(this.projection.split(",").map((k) => [k.trim(), r[k.trim()]]))); data = this.one ? out[0] ?? null : out; } return resolve({ data, error: null, count: selected.length }); } catch (e) { const result = { data: null, error: { message: e instanceof Error ? e.message : "Google Sheets error" } }; return reject ? reject(result) : resolve(result); } }
}
const storage = { from: (_bucket: string) => ({ upload: async (..._args: any[]) => ({ data: null, error: { message: "Google Drive not configured" } }), remove: async (..._args: any[]) => ({ data: null, error: { message: "Google Drive not configured" } }), createSignedUrl: async (..._args: any[]) => ({ data: null, error: { message: "Google Drive not configured" } }) }) };
export function createSheetsClient() { return { from: (table: string) => new Query(table), storage, rpc: (..._args: any[]) => new Query("__rpc__") }; }
