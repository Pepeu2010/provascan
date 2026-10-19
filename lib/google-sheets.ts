import "server-only";
import { google, sheets_v4 } from "googleapis";
import { Readable } from "node:stream";
import { withOperationalWriteLock } from "@/lib/operational-lock";

const spreadsheetId = process.env.GOOGLE_SHEET_ID;
const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
export class GoogleSheetsConfigError extends Error {}
export class GoogleSheetsConnectionError extends Error {}
type Row = Record<string, unknown>;

export function assertGoogleSheetsConfig() {
  if (!spreadsheetId || !email || !privateKey) throw new GoogleSheetsConfigError("Google Sheets não configurado. Configure GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY no ambiente do servidor.");
}

function api(): sheets_v4.Sheets {
  assertGoogleSheetsConfig();
  const auth = new google.auth.JWT({ email, key: privateKey, scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"] });
  return google.sheets({ version: "v4", auth });
}
function driveApi() {
  assertGoogleSheetsConfig();
  const auth = new google.auth.JWT({ email, key: privateKey, scopes: ["https://www.googleapis.com/auth/drive.file"] });
  return google.drive({ version: "v3", auth });
}
function encode(value: unknown): string | number | boolean { return value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : value as string | number | boolean; }
function decode(value: string): unknown { const v = value.trim(); if (!v) return null; if (v === "true") return true; if (v === "false") return false; try { return JSON.parse(v); } catch { return v; } }
function validateRowsAgainstHeaders(table: string, headers: string[], rows: Row[]) {
  if (!headers.length) throw new GoogleSheetsConnectionError(`A aba ${table} não possui uma linha de cabeçalho.`);
  const known = new Set(headers);
  const missing = [...new Set(rows.flatMap((row) => Object.keys(row).filter((key) => !known.has(key))))];
  if (missing.length) throw new GoogleSheetsConnectionError(`A aba ${table} não possui as colunas: ${missing.join(", ")}.`);
}
function cell(value: unknown): sheets_v4.Schema$CellData {
  const encoded = encode(value);
  if (typeof encoded === "boolean") return { userEnteredValue: { boolValue: encoded } };
  if (typeof encoded === "number") return { userEnteredValue: { numberValue: encoded } };
  return { userEnteredValue: { stringValue: encoded } };
}
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
    append: async (rows: Row[]) => withOperationalWriteLock(spreadsheetId ?? "unconfigured", async () => {
      if (!rows.length) return;
      validateRowsAgainstHeaders(table, source.headers, rows);
      await api().spreadsheets.values.append({
        spreadsheetId,
        range: `'${table.replace(/'/g, "''")}'`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: rows.map((row) => source.headers.map((header) => encode(row[header]))) },
      });
    }),
    replace: async (rows: Row[]) => withOperationalWriteLock(spreadsheetId ?? "unconfigured", async () => {
      validateRowsAgainstHeaders(table, source.headers, rows);
      const spreadsheet = await api().spreadsheets.get({ spreadsheetId, fields: "sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))" });
      const sheet = spreadsheet.data.sheets?.find((item) => item.properties?.title === table)?.properties;
      if (sheet?.sheetId == null) throw new GoogleSheetsConnectionError(`A aba ${table} não existe na planilha.`);
      const rowCount = Math.max(1, Number(sheet.gridProperties?.rowCount ?? rows.length + 1));
      const columnCount = Math.max(source.headers.length, Number(sheet.gridProperties?.columnCount ?? source.headers.length));
      await api().spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [
          { repeatCell: { range: { sheetId: sheet.sheetId, startRowIndex: 0, endRowIndex: rowCount, startColumnIndex: 0, endColumnIndex: columnCount }, cell: {}, fields: "userEnteredValue" } },
          { updateCells: { start: { sheetId: sheet.sheetId, rowIndex: 0, columnIndex: 0 }, rows: [source.headers, ...rows.map((row) => source.headers.map((header) => row[header]))].map((line) => ({ values: line.map(cell) })), fields: "userEnteredValue" } },
        ] },
      });
    }),
  };
}
export async function findRows(table: string, predicate?: (row: Row) => boolean, limit = 500) { return (await readTable(table)).rows.filter(predicate ?? (() => true)).slice(0, limit); }
export async function updateRows(table: string, predicate: (row: Row) => boolean, changes: Row) { return withOperationalWriteLock(spreadsheetId ?? "unconfigured", async () => { const target = await sheetsTable(table); const rows = target.all(); let count = 0; const next = rows.map((row) => predicate(row) ? (++count, { ...row, ...changes }) : row); if (count) await target.replace(next); return count; }); }
export async function deleteRows(table: string, predicate: (row: Row) => boolean) { return withOperationalWriteLock(spreadsheetId ?? "unconfigured", async () => { const target = await sheetsTable(table); const rows = target.all(); const next = rows.filter((row) => !predicate(row)); const count = rows.length - next.length; if (count) await target.replace(next); return count; }); }
export async function upsertRows(table: string, incoming: Row[], conflictKeys: string[], ignoreDuplicates: boolean) {
  return withOperationalWriteLock(spreadsheetId ?? "unconfigured", async () => {
    const target = await sheetsTable(table);
    const next = [...target.all()];
    const returned: Row[] = [];
    for (const item of incoming) {
      const index = next.findIndex((row) => conflictKeys.every((key) => String(row[key] ?? "") === String(item[key] ?? "")));
      if (index >= 0) {
        if (!ignoreDuplicates) next[index] = { ...next[index], ...item };
        returned.push(next[index]);
      } else {
        next.push(item);
        returned.push(item);
      }
    }
    await target.replace(next);
    return returned;
  });
}

export async function uploadPrivateFile(name: string, bytes: Uint8Array, mimeType: string) {
  try {
    return await withOperationalWriteLock(spreadsheetId ?? "unconfigured", async () => {
    if (!driveFolderId) throw new GoogleSheetsConfigError("Configure GOOGLE_DRIVE_FOLDER_ID para armazenar arquivos privados.");
    const response = await driveApi().files.create({
      requestBody: { name, mimeType, parents: [driveFolderId] },
      media: { mimeType, body: Readable.from(Buffer.from(bytes)) },
      fields: "id",
      supportsAllDrives: true,
    });
    if (!response.data.id) throw new Error("Google Drive não retornou o identificador do arquivo.");
    return response.data.id;
    });
  } catch (error) {
    console.error("Google Drive upload failed", { message: error instanceof Error ? error.message : "unknown" });
    throw new GoogleSheetsConnectionError("Não foi possível armazenar o arquivo original.");
  }
}

export async function deletePrivateFiles(fileIds: string[]) {
  if (!fileIds.length) return;
  try {
    await withOperationalWriteLock(spreadsheetId ?? "unconfigured", async () => Promise.all(fileIds.map((fileId) => driveApi().files.delete({ fileId, supportsAllDrives: true }))));
  } catch (error) {
    console.error("Google Drive delete failed", { message: error instanceof Error ? error.message : "unknown" });
    throw new GoogleSheetsConnectionError("Não foi possível remover o arquivo original.");
  }
}

export async function downloadPrivateFile(fileId: string) {
  try {
    const response = await driveApi().files.get({ fileId, alt: "media", supportsAllDrives: true }, { responseType: "arraybuffer" });
    return Buffer.from(response.data as ArrayBuffer);
  } catch (error) {
    console.error("Google Drive download failed", { message: error instanceof Error ? error.message : "unknown" });
    throw new GoogleSheetsConnectionError("Não foi possível abrir o arquivo original.");
  }
}
