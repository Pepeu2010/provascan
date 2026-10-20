import assert from "node:assert/strict";
import { decodeGoogleSheetsCell, encodeGoogleSheetsCell, encodeGoogleSheetsTableValues } from "../lib/google-sheets-codec";
import type { GoogleSheetsColumnDefinition } from "../lib/google-sheets-schema";

const column = (type: GoogleSheetsColumnDefinition["type"], nullable = false): GoogleSheetsColumnDefinition => ({ type, nullable });
function roundTrip(value: unknown, schema: GoogleSheetsColumnDefinition) {
  return decodeGoogleSheetsCell(encodeGoogleSheetsCell(value, schema), schema);
}

for (const id of ["000123", "1e3", "false", "null", "", "__PROVASCAN_CELL_V1__:NULL"]) {
  assert.equal(roundTrip(id, column("text")), id, `identificador textual alterado: ${id}`);
}
assert.equal(roundTrip(null, column("text", true)), null);
assert.equal(roundTrip("", column("text", true)), "");
assert.equal(roundTrip("2026-10-19T13:55:02.123456789Z", column("timestamptz")), "2026-10-19T13:55:02.123456789Z");
assert.equal(roundTrip(true, column("boolean")), true);
assert.equal(roundTrip(-12, column("integer")), -12);
assert.equal(roundTrip(1.25, column("numeric")), 1.25);
const json = { array: ["001", null, false, { code: "0005" }], nested: { value: "1e3" } };
assert.deepEqual(roundTrip(json, column("jsonb", true)), json);
assert.deepEqual(roundTrip(["001", 1, true], column("jsonb")), ["001", 1, true]);
assert.throws(() => encodeGoogleSheetsCell(9007199254740992, column("bigint")));

const userColumns = {
  access_key: column("text"),
  active: column("boolean"),
  last_login_at: column("timestamptz", true),
};
const userValues = encodeGoogleSheetsTableValues(
  ["access_key", "active", "last_login_at"],
  [{ access_key: "professor.teste", active: true, last_login_at: "2026-10-20T00:00:00.000Z" }],
  userColumns,
);
assert.deepEqual(userValues[0], ["access_key", "active", "last_login_at"], "os cabeçalhos devem permanecer texto mesmo quando nomeiam colunas booleanas");
assert.deepEqual(userValues[1], ["professor.teste", true, "2026-10-20T00:00:00.000Z"], "as linhas devem ser codificadas conforme os tipos reais das colunas");

console.log("Codec Google Sheets: ida e volta preservou texto, vazios, nulos, JSON, tipos e precisão temporal.");
