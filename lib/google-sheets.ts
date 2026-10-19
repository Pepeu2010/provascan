import "server-only";
import { google, sheets_v4 } from "googleapis";

const spreadsheetId = process.env.GOOGLE_SHEET_ID;
const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
export class GoogleSheetsConfigError extends Error {}
export class GoogleSheetsConnectionError extends Error {}
type Row = Record<string, unknown>;

function api(): sheets_v4.Sheets {
  if (!spreadsheetId || !email || !privateKey) throw new GoogleSheetsConfigError("Google Sheets não configurado.");
  const auth = new google.auth.JWT({ email, key: privateKey, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  return google.sheets({ version: "v4", auth });
}
function encode(value: unknown): string | number | boolean { return value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : value as string | number | boolean; }
function decode(value: string): unknown { const v = value.trim(); if (!v) return null; if (v === "true") return true; if (v === "false") return false; try { return JSON.parse(v); } catch { return v; } }
async function readTable(table: string): Promise<{ headers: string[]; rows: Row[] }> {
  try {
    const response = await api().spreadsheets.values.get({ spreadsheetId, range: `'${table.replace(/'/g, "''")}'` });
    const values = response.data.values ?? [];
    const headers = (values[0] ?? []).map(String);
    const rows = values.slice(1).map((line) => Object.fromEntries(headers.map((header, index) => [header, decode(String(line[index] ?? ""))])));
    return { headers, rows };
  } catch (error) { console.error("Google Sheets request failed", { table, message: error instanceof Error ? error.message : "unknown" }); throw new GoogleSheetsConnectionError("Erro ao acessar os dados do sistema."); }
}
export async function sheetsTable(table: string) {
  const source = await readTable(table);
  return {
    all: () => source.rows,
    headers: source.headers,
    append: async (rows: Row[]) => { if (rows.length) await api().spreadsheets.values.append({ spreadsheetId, range: `'${table}'`, valueInputOption: "RAW", insertDataOption: "INSERT_ROWS", requestBody: { values: rows.map((row) => source.headers.map((header) => encode(row[header]))) } }); },
    replace: async (rows: Row[]) => { await api().spreadsheets.values.clear({ spreadsheetId, range: `'${table}'` }); await api().spreadsheets.values.update({ spreadsheetId, range: `'${table}'!A1`, valueInputOption: "RAW", requestBody: { values: [source.headers, ...rows.map((row) => source.headers.map((header) => encode(row[header])))] } }); },
  };
}
export async function findRows(table: string, predicate?: (row: Row) => boolean, limit = 500) { return (await readTable(table)).rows.filter(predicate ?? (() => true)).slice(0, limit); }
export async function updateRows(table: string, predicate: (row: Row) => boolean, changes: Row) { const target = await sheetsTable(table); const rows = target.all(); let count = 0; const next = rows.map((row) => predicate(row) ? (++count, { ...row, ...changes }) : row); if (count) await target.replace(next); return count; }
export async function deleteRows(table: string, predicate: (row: Row) => boolean) { const target = await sheetsTable(table); const rows = target.all(); const next = rows.filter((row) => !predicate(row)); const count = rows.length - next.length; if (count) await target.replace(next); return count; }
