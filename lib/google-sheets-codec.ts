import { Buffer } from "node:buffer";
import type { GoogleSheetsColumnDefinition } from "@/lib/google-sheets-schema";

export type GoogleSheetsCellValue = string | number | boolean;
export class GoogleSheetsCodecError extends Error {}

const MARKER = "__PROVASCAN_CELL_V1__:";
const NULL_MARKER = `${MARKER}NULL`;
const EMPTY_TEXT_MARKER = `${MARKER}EMPTY_TEXT`;
const ESCAPED_TEXT_MARKER = `${MARKER}STRING:`;

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new GoogleSheetsCodecError("JSON numérico inválido.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
  }
  throw new GoogleSheetsCodecError("Valor JSON incompatível com o esquema.");
}

function encodeText(value: string): string {
  if (value === "") return EMPTY_TEXT_MARKER;
  if (value.startsWith(MARKER)) return ESCAPED_TEXT_MARKER + Buffer.from(value, "utf8").toString("base64url");
  return value;
}

function decodeText(value: string): string {
  if (value === NULL_MARKER) throw new GoogleSheetsCodecError("Null recebido em coluna de texto não anulável.");
  if (value === EMPTY_TEXT_MARKER) return "";
  if (value.startsWith(ESCAPED_TEXT_MARKER)) {
    try {
      return Buffer.from(value.slice(ESCAPED_TEXT_MARKER.length), "base64url").toString("utf8");
    } catch {
      throw new GoogleSheetsCodecError("Marcador de texto inválido.");
    }
  }
  return value;
}

export function encodeGoogleSheetsCell(value: unknown, column: GoogleSheetsColumnDefinition): GoogleSheetsCellValue {
  if (value === undefined || value === null) {
    if (!column.nullable) throw new GoogleSheetsCodecError("Null em coluna não anulável.");
    return NULL_MARKER;
  }

  switch (column.type) {
    case "text":
    case "uuid":
    case "timestamptz":
      if (typeof value !== "string") throw new GoogleSheetsCodecError("Texto, identificador e data devem permanecer textuais.");
      if (column.type === "timestamptz" && !Number.isFinite(Date.parse(value))) {
        throw new GoogleSheetsCodecError("Data/hora inválida.");
      }
      return encodeText(value);
    case "boolean":
      if (typeof value !== "boolean") throw new GoogleSheetsCodecError("Booleano incompatível com o esquema.");
      return value;
    case "integer":
    case "bigint":
      if (typeof value !== "number" || !Number.isSafeInteger(value)) {
        throw new GoogleSheetsCodecError("Inteiro fora do intervalo seguro.");
      }
      return value;
    case "numeric":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new GoogleSheetsCodecError("Número incompatível com o esquema.");
      }
      return value;
    case "jsonb":
      return canonicalJson(value);
  }
}

/** Keeps table headers textual while encoding each data cell by its schema. */
export function encodeGoogleSheetsTableValues(
  headers: string[],
  rows: Array<Record<string, unknown>>,
  columns: Readonly<Record<string, GoogleSheetsColumnDefinition>>,
): GoogleSheetsCellValue[][] {
  return [
    headers,
    ...rows.map((row) => headers.map((header) => encodeGoogleSheetsCell(row[header], columns[header]))),
  ];
}

export function decodeGoogleSheetsCell(value: unknown, column: GoogleSheetsColumnDefinition): unknown {
  if (value === undefined || value === null || value === "") {
    if (column.type === "text" && !column.nullable) return "";
    if (!column.nullable) throw new GoogleSheetsCodecError("Célula vazia em coluna não anulável.");
    return null;
  }

  if (typeof value === "string" && value === NULL_MARKER) {
    if (!column.nullable) throw new GoogleSheetsCodecError("Null recebido em coluna não anulável.");
    return null;
  }

  switch (column.type) {
    case "text":
    case "uuid":
    case "timestamptz":
      if (typeof value !== "string") throw new GoogleSheetsCodecError("A planilha contém tipo incompatível com coluna textual.");
      return decodeText(value);
    case "boolean":
      if (typeof value === "boolean") return value;
      if (value === "true") return true;
      if (value === "false") return false;
      throw new GoogleSheetsCodecError("A planilha contém booleano inválido.");
    case "integer":
    case "bigint": {
      const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
      if (!Number.isSafeInteger(number)) throw new GoogleSheetsCodecError("A planilha contém inteiro fora do intervalo seguro.");
      return number;
    }
    case "numeric": {
      const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
      if (!Number.isFinite(number)) throw new GoogleSheetsCodecError("A planilha contém número inválido.");
      return number;
    }
    case "jsonb":
      if (typeof value !== "string") return value;
      try {
        return JSON.parse(value) as unknown;
      } catch {
        throw new GoogleSheetsCodecError("A planilha contém JSON inválido.");
      }
  }
}
