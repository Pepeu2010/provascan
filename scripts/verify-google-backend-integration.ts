import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { Readable } from "node:stream";
import { google } from "googleapis";
import { Redis } from "@upstash/redis";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta variável de integração: ${name}`);
  return value;
}

async function main() {
  if (process.env.GOOGLE_INTEGRATION_TESTS !== "true") throw new Error("Defina GOOGLE_INTEGRATION_TESTS=true apenas em ambiente isolado.");
  assert.equal(required("GOOGLE_TEST_RESOURCE_CONFIRMATION"), "ISOLATED", "confirme que planilha, pasta e Redis são de teste isolado");
  const spreadsheetId = required("GOOGLE_TEST_SHEET_ID");
  const folderId = required("GOOGLE_TEST_DRIVE_FOLDER_ID");
  const email = required("GOOGLE_TEST_SERVICE_ACCOUNT_EMAIL");
  const privateKey = required("GOOGLE_TEST_PRIVATE_KEY").replace(/\\n/g, "\n");
  const redisUrl = required("UPSTASH_TEST_REDIS_REST_URL");
  const redisToken = required("UPSTASH_TEST_REDIS_REST_TOKEN");
  assert.notEqual(spreadsheetId, process.env.GOOGLE_SHEET_ID, "planilha operacional recusada");
  assert.notEqual(folderId, process.env.GOOGLE_DRIVE_FOLDER_ID, "pasta operacional recusada");
  assert.notEqual(redisUrl, process.env.UPSTASH_REDIS_REST_URL, "Redis operacional recusado");

  const auth = new google.auth.JWT({ email, key: privateKey, scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"] });
  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });
  const redis = new Redis({ url: redisUrl, token: redisToken });
  const key = `__integration_${randomUUID()}`;
  const bytes = Buffer.from(`ProvaScan isolated Drive integration ${randomUUID()}`);
  const lockKey = `provascan:integration:${randomUUID()}`;
  const lockOwner = randomUUID();
  let rowNumber: number | null = null;
  let fileId: string | null = null;
  let lockAcquired = false;
  try {
    const append = await sheets.spreadsheets.values.append({ spreadsheetId, range: "'app_settings_internal'!A:C", valueInputOption: "RAW", insertDataOption: "INSERT_ROWS", requestBody: { values: [[key, "created", "2026-10-19T00:00:00.000Z"]] } });
    const updatedRange = append.data.updates?.updatedRange ?? "";
    const match = updatedRange.match(/![A-Z]+(\d+):/);
    assert.ok(match, "conta de serviço deve inserir na aba isolada");
    rowNumber = Number(match[1]);
    const read = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'app_settings_internal'!A${rowNumber}:C${rowNumber}`, valueRenderOption: "UNFORMATTED_VALUE" });
    assert.equal(read.data.values?.[0]?.[0], key);
    assert.equal(read.data.values?.[0]?.[1], "created");
    await sheets.spreadsheets.values.update({ spreadsheetId, range: `'app_settings_internal'!A${rowNumber}:C${rowNumber}`, valueInputOption: "RAW", requestBody: { values: [[key, "edited", "2026-10-19T00:00:00.000Z"]] } });
    const reread = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'app_settings_internal'!A${rowNumber}:C${rowNumber}`, valueRenderOption: "UNFORMATTED_VALUE" });
    assert.equal(reread.data.values?.[0]?.[1], "edited");

    const uploaded = await drive.files.create({ requestBody: { name: `codex-integration-${randomUUID()}.txt`, mimeType: "text/plain", parents: [folderId] }, media: { mimeType: "text/plain", body: Readable.from(bytes) }, fields: "id", supportsAllDrives: true });
    assert.ok(uploaded.data.id, "conta de serviço deve criar arquivo privado na pasta isolada");
    fileId = uploaded.data.id;
    const download = await drive.files.get({ fileId, alt: "media", supportsAllDrives: true }, { responseType: "arraybuffer" });
    assert.equal(createHash("sha256").update(Buffer.from(download.data as ArrayBuffer)).digest("hex"), createHash("sha256").update(bytes).digest("hex"), "download autenticado e checksum devem corresponder");

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets(properties(sheetId,title))" });
    const sheetId = spreadsheet.data.sheets?.find((item) => item.properties?.title === "app_settings_internal")?.properties?.sheetId;
    assert.notEqual(sheetId, undefined);
    const result = await redis.set(lockKey, lockOwner, { nx: true, px: 15_000 });
    assert.equal(result, "OK", "Redis de teste precisa aceitar a lease");
    lockAcquired = true;
    assert.notEqual(await redis.set(lockKey, randomUUID(), { nx: true, px: 15_000 }), "OK", "Redis precisa bloquear lock concorrente");

    const values = await sheets.spreadsheets.values.get({ spreadsheetId, range: "'app_settings_internal'!A:C", valueRenderOption: "UNFORMATTED_VALUE" });
    const actualRowIndex = (values.data.values ?? []).findIndex((line) => line[0] === key);
    assert.ok(actualRowIndex >= 1, "registro sintético precisa ser localizável para remoção");
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{ deleteDimension: { range: { sheetId: sheetId!, dimension: "ROWS", startIndex: actualRowIndex, endIndex: actualRowIndex + 1 } } }] } });
    rowNumber = null;
    const deleted = await sheets.spreadsheets.values.get({ spreadsheetId, range: "'app_settings_internal'!A:C", valueRenderOption: "UNFORMATTED_VALUE" });
    assert.equal((deleted.data.values ?? []).some((line) => line[0] === key), false, "registro de teste precisa ser removido");
    await drive.files.delete({ fileId, supportsAllDrives: true });
    fileId = null;
    await redis.eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end", [lockKey], [lockOwner]);
    lockAcquired = false;
    console.log("Google integration: autenticação, CRUD isolado de Sheets, upload/download privado com SHA-256 e permissão/lock Upstash passaram.");
  } finally {
    if (rowNumber !== null) {
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets(properties(sheetId,title))" });
      const sheetId = spreadsheet.data.sheets?.find((item) => item.properties?.title === "app_settings_internal")?.properties?.sheetId;
      const values = await sheets.spreadsheets.values.get({ spreadsheetId, range: "'app_settings_internal'!A:C", valueRenderOption: "UNFORMATTED_VALUE" });
      const index = (values.data.values ?? []).findIndex((line) => line[0] === key);
      if (sheetId !== undefined && index >= 1) await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{ deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: index, endIndex: index + 1 } } }] } });
    }
    if (fileId) await drive.files.delete({ fileId, supportsAllDrives: true });
    if (lockAcquired) await redis.eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end", [lockKey], [lockOwner]);
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Falha na integração Google.");
  process.exitCode = 1;
});
