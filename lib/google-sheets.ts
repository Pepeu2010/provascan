import "server-only";
import { google, sheets_v4 } from "googleapis";
import { Readable } from "node:stream";
import { assertOperationalWriteLock, getOperationalWriteCacheValue, setOperationalWriteCacheValue, withOperationalWriteLock } from "@/lib/operational-lock";
import { decodeGoogleSheetsCell, encodeGoogleSheetsTableValues } from "@/lib/google-sheets-codec";
import { GOOGLE_SHEETS_SCHEMA } from "@/lib/google-sheets-schema";
import { assertUniqueGoogleSheetsKeys, mergeGoogleSheetsUpsert } from "@/lib/google-sheets-row-integrity";

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
function definition(table: string) {
  const schema = GOOGLE_SHEETS_SCHEMA[table];
  if (!schema) throw new GoogleSheetsConnectionError(`A tabela ${table} não está no esquema do Google Sheets.`);
  return schema;
}
function validateRowsAgainstHeaders(table: string, headers: string[], rows: Row[]) {
  if (!headers.length) throw new GoogleSheetsConnectionError(`A aba ${table} não possui uma linha de cabeçalho.`);
  if (new Set(headers).size !== headers.length) throw new GoogleSheetsConnectionError(`A aba ${table} contém cabeçalhos repetidos.`);
  const known = new Set(headers);
  const missing = [...new Set(rows.flatMap((row) => Object.keys(row).filter((key) => !known.has(key))))];
  if (missing.length) throw new GoogleSheetsConnectionError(`A aba ${table} não possui as colunas: ${missing.join(", ")}.`);
  const schema = definition(table);
  for (const header of headers) if (!schema.columns[header]) throw new GoogleSheetsConnectionError(`A aba ${table} contém coluna fora do esquema.`);
}
function encodedCell(encoded: string | number | boolean): sheets_v4.Schema$CellData {
  if (typeof encoded === "boolean") return { userEnteredValue: { boolValue: encoded } };
  if (typeof encoded === "number") return { userEnteredValue: { numberValue: encoded } };
  return { userEnteredValue: { stringValue: encoded } };
}
function decodeTableValues(table: string, values: unknown[][]): { headers: string[]; rows: Row[] } {
  const schema = definition(table);
  const headers = (values[0] ?? []).map(String);
  validateRowsAgainstHeaders(table, headers, []);
  const rows = values.slice(1).filter((line) => line.some((value) => value !== "" && value !== undefined)).map((line) => Object.fromEntries(headers.map((header, index) => [header, decodeGoogleSheetsCell(line[index], schema.columns[header])])));
  assertUniqueGoogleSheetsKeys(rows, [...schema.primaryKey], table);
  return { headers, rows };
}
async function readTables(tables: string[]) {
  const results = new Map<string, { headers: string[]; rows: Row[] }>();
  if (!tables.length) return results;
  try {
    const response = await api().spreadsheets.values.batchGet({ spreadsheetId, ranges: tables.map((table) => `'${table.replace(/'/g, "''")}'`), valueRenderOption: "UNFORMATTED_VALUE" });
    const valuesByTable = response.data.valueRanges ?? [];
    tables.forEach((table, index) => {
      const result = decodeTableValues(table, valuesByTable[index]?.values ?? []);
      results.set(table, result);
      setOperationalWriteCacheValue(`google-sheets:${spreadsheetId ?? "unconfigured"}:table:${table}`, result);
    });
    return results;
  } catch (error) {
    console.error("Google Sheets request failed", { tables, message: error instanceof Error ? error.message : "unknown" });
    throw new GoogleSheetsConnectionError("Erro ao acessar os dados do sistema.");
  }
}
async function readTable(table: string): Promise<{ headers: string[]; rows: Row[] }> {
  const cacheKey = `google-sheets:${spreadsheetId ?? "unconfigured"}:table:${table}`;
  const cached = getOperationalWriteCacheValue<{ headers: string[]; rows: Row[] }>(cacheKey);
  if (cached) return cached;
  const results = await readTables([table]);
  const result = results.get(table);
  if (!result) throw new GoogleSheetsConnectionError("Erro ao acessar os dados do sistema.");
  return result;
}
export async function sheetsTable(table: string) {
  const source = await readTable(table);
  return {
    all: () => source.rows,
    headers: source.headers,
    append: async (rows: Row[]) => withOperationalWriteLock(spreadsheetId ?? "unconfigured", async () => {
      if (!rows.length) return;
      const current = await readTable(table);
      validateRowsAgainstHeaders(table, current.headers, rows);
      const schema = definition(table);
      const next = [...current.rows, ...rows];
      assertUniqueGoogleSheetsKeys(next, [...schema.primaryKey], table);
      await replaceRows(table, current.headers, next);
    }),
    replace: async (rows: Row[]) => withOperationalWriteLock(spreadsheetId ?? "unconfigured", async () => {
      validateRowsAgainstHeaders(table, source.headers, rows);
      const schema = definition(table);
      assertUniqueGoogleSheetsKeys(rows, [...schema.primaryKey], table);
      await replaceRows(table, source.headers, rows);
    }),
  };
}

export async function preloadGoogleSheetsWriteContext(tables: string[]) {
  assertOperationalWriteLock();
  const uncached = [...new Set(tables)].filter((table) => !getOperationalWriteCacheValue(`google-sheets:${spreadsheetId ?? "unconfigured"}:table:${table}`));
  await readTables(uncached);
  const metadataCacheKey = `google-sheets:${spreadsheetId ?? "unconfigured"}:spreadsheet-metadata`;
  if (!getOperationalWriteCacheValue<sheets_v4.Schema$Spreadsheet>(metadataCacheKey)) {
    const response = await api().spreadsheets.get({ spreadsheetId, fields: "sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))" });
    setOperationalWriteCacheValue(metadataCacheKey, response.data);
  }
}

export async function appendRows(table: string, rows: Row[]) {
  return withOperationalWriteLock(spreadsheetId ?? "unconfigured", async () => {
    if (!rows.length) return;
    const current = await readTable(table);
    validateRowsAgainstHeaders(table, current.headers, rows);
    const schema = definition(table);
    const next = [...current.rows, ...rows];
    assertUniqueGoogleSheetsKeys(next, [...schema.primaryKey], table);
    await replaceRows(table, current.headers, next);
  });
}
async function replaceRows(table: string, headers: string[], rows: Row[]) {
  assertOperationalWriteLock();
  const metadataCacheKey = `google-sheets:${spreadsheetId ?? "unconfigured"}:spreadsheet-metadata`;
  let spreadsheet = getOperationalWriteCacheValue<sheets_v4.Schema$Spreadsheet>(metadataCacheKey);
  if (!spreadsheet) {
    const response = await api().spreadsheets.get({ spreadsheetId, fields: "sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))" });
    spreadsheet = response.data;
    setOperationalWriteCacheValue(metadataCacheKey, spreadsheet);
  }
  const sheet = spreadsheet.sheets?.find((item) => item.properties?.title === table)?.properties;
  if (sheet?.sheetId == null) throw new GoogleSheetsConnectionError(`A aba ${table} não existe na planilha.`);
  const rowCount = Math.max(1, Number(sheet.gridProperties?.rowCount ?? rows.length + 1));
  const columnCount = Math.max(headers.length, Number(sheet.gridProperties?.columnCount ?? headers.length));
  const schema = definition(table);
  const values = encodeGoogleSheetsTableValues(headers, rows, schema.columns);
  assertOperationalWriteLock();
  await api().spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [
      { repeatCell: { range: { sheetId: sheet.sheetId, startRowIndex: 0, endRowIndex: rowCount, startColumnIndex: 0, endColumnIndex: columnCount }, cell: {}, fields: "userEnteredValue" } },
      { updateCells: { start: { sheetId: sheet.sheetId, rowIndex: 0, columnIndex: 0 }, rows: values.map((line) => ({ values: line.map(encodedCell) })), fields: "userEnteredValue" } },
    ] },
  });
  setOperationalWriteCacheValue(`google-sheets:${spreadsheetId ?? "unconfigured"}:table:${table}`, { headers, rows });
}
export async function findRows(table: string, predicate?: (row: Row) => boolean, limit = 500) { return (await readTable(table)).rows.filter(predicate ?? (() => true)).slice(0, limit); }
export async function updateRowsReturning(table: string, predicate: (row: Row) => boolean, changes: Row) {
  return withOperationalWriteLock(spreadsheetId ?? "unconfigured", async () => {
    const target = await sheetsTable(table);
    const rows = target.all();
    const changed: Row[] = [];
    const next = rows.map((row) => {
      if (!predicate(row)) return row;
      const updated = { ...row, ...changes };
      changed.push(updated);
      return updated;
    });
    if (changed.length) await target.replace(next);
    return changed;
  });
}
export async function updateRows(table: string, predicate: (row: Row) => boolean, changes: Row) { return (await updateRowsReturning(table, predicate, changes)).length; }
export async function deleteRowsReturning(table: string, predicate: (row: Row) => boolean) {
  return withOperationalWriteLock(spreadsheetId ?? "unconfigured", async () => {
    const target = await sheetsTable(table);
    const rows = target.all();
    const removed: Row[] = [];
    const kept = rows.filter((row) => {
      if (!predicate(row)) return true;
      removed.push(row);
      return false;
    });
    if (removed.length) await target.replace(kept);
    return removed;
  });
}
export async function deleteRows(table: string, predicate: (row: Row) => boolean) { return (await deleteRowsReturning(table, predicate)).length; }
export async function upsertRows(table: string, incoming: Row[], conflictKeys: string[], ignoreDuplicates: boolean) {
  return withOperationalWriteLock(spreadsheetId ?? "unconfigured", async () => {
    const target = await sheetsTable(table);
    const schema = definition(table);
    const keys = conflictKeys.length ? conflictKeys : [...schema.primaryKey];
    const next = mergeGoogleSheetsUpsert(target.all(), incoming, keys, ignoreDuplicates, table);
    await target.replace(next);
    return incoming.map((item) => next.find((row) => keys.every((key) => row[key] === item[key])) as Row);
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
    const raw = error as { code?: number; message?: string; errors?: Array<{ reason?: string }> };
    const quotaBlocked = raw.code === 403 && (raw.errors?.some((item) => item.reason === "storageQuotaExceeded") || /storage.?quota/i.test(raw.message ?? ""));
    if (quotaBlocked) throw new GoogleSheetsConfigError("A conta de serviço não pode gravar nesta pasta por limite de propriedade/cota. Use uma pasta privada de Shared Drive com permissão de inclusão ou OAuth delegado a uma conta humana.");
    console.error("Google Drive upload failed", { code: raw.code ?? "unknown", reason: raw.errors?.[0]?.reason ?? "unknown" });
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
