/** Compare decoded Sheets cells without collapsing text, null, and typed values. */
export function equalSheetsValue(left: unknown, right: unknown): boolean {
  return Object.is(left, right);
}

export function isSheetsNull(value: unknown): boolean {
  return value === null || value === undefined;
}

export function compareSheetsValues(left: unknown, right: unknown): number {
  if (isSheetsNull(left)) return isSheetsNull(right) ? 0 : -1;
  if (isSheetsNull(right)) return 1;
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), "pt-BR", { numeric: true, sensitivity: "base" });
}
