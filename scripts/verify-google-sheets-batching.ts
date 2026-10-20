import assert from "node:assert/strict";
import { createGoogleSheetsReadBatcher, readGoogleSheetsTableBatch } from "../lib/google-sheets-batching";

async function main() {
  let apiCalls = 0;
  let requestedRanges: string[] = [];
  const results = await readGoogleSheetsTableBatch(
    ["exams", "answer_keys", "teacher's notes", "exams"],
    async (ranges) => {
      apiCalls += 1;
      requestedRanges = ranges;
      return [
        { values: [["id", "title"], ["exam-1", "Avaliação"]] },
        { values: [["id", "exam_id"], ["key-1", "exam-1"]] },
        { values: [["id"], ["note-1"]] },
      ];
    },
    (table, values) => ({ table, rowCount: Math.max(0, values.length - 1) }),
  );

  assert.equal(apiCalls, 1, "múltiplas abas devem usar uma única chamada batchGet");
  assert.deepEqual(requestedRanges, ["'exams'", "'answer_keys'", "'teacher''s notes'"], "abas duplicadas devem ser removidas e nomes escapados");
  assert.deepEqual([...results.entries()], [
    ["exams", { table: "exams", rowCount: 1 }],
    ["answer_keys", { table: "answer_keys", rowCount: 1 }],
    ["teacher's notes", { table: "teacher's notes", rowCount: 1 }],
  ]);

  apiCalls = 0;
  const empty = await readGoogleSheetsTableBatch([], async () => { apiCalls += 1; return []; }, () => null);
  assert.equal(apiCalls, 0, "nenhuma aba não deve fazer chamada à API");
  assert.equal(empty.size, 0);

  const queuedBatches: string[][] = [];
  const read = createGoogleSheetsReadBatcher(async (tables) => {
    queuedBatches.push(tables);
    return new Map(tables.map((table) => [table, { table }]));
  });
  const [examRead, studentRead, repeatedExamRead] = await Promise.all([read("exams"), read("students"), read("exams")]);
  assert.deepEqual(queuedBatches, [["exams", "students"]], "leituras concorrentes e duplicadas devem compartilhar um único batchGet");
  assert.deepEqual(examRead, { table: "exams" });
  assert.deepEqual(studentRead, { table: "students" });
  assert.deepEqual(repeatedExamRead, examRead, "a mesma leitura concorrente deve receber o mesmo resultado");

  queuedBatches.length = 0;
  const queryLikeReads = ["classes", "students", "classes"].map((table) => ({
    then: (resolve: (value: { table: string }) => unknown, reject?: (reason: unknown) => unknown) => read(table).then(resolve, reject),
  }));
  await Promise.all(queryLikeReads as PromiseLike<{ table: string }>[]);
  assert.deepEqual(queuedBatches, [["classes", "students"]], "thenable queries inside Promise.all must be coalesced before batchGet");

  let finishInFlight: ((result: Map<string, string>) => void) | undefined;
  let inFlightCalls = 0;
  const readDuringRequest = createGoogleSheetsReadBatcher((tables) => {
    inFlightCalls += 1;
    return new Promise<Map<string, string>>((resolve) => { finishInFlight = resolve; }).then((results) => new Map(tables.map((table) => [table, results.get(table) ?? "missing"])));
  });
  const firstRead = readDuringRequest("app_users");
  await Promise.resolve();
  const secondRead = readDuringRequest("app_users");
  finishInFlight?.(new Map([["app_users", "users"]]));
  assert.deepEqual(await Promise.all([firstRead, secondRead]), ["users", "users"], "leitores que chegam durante batchGet devem ser atendidos pelo mesmo pedido");
  assert.equal(inFlightCalls, 1);

  let attempts = 0;
  const retryingRead = createGoogleSheetsReadBatcher(async (tables) => {
    attempts += 1;
    if (attempts === 1) throw new Error("temporary quota error");
    return new Map(tables.map((table) => [table, table]));
  });
  await assert.rejects(retryingRead("app_users"), /temporary quota error/);
  assert.equal(await retryingRead("app_users"), "app_users", "falhas de uma chamada não devem bloquear as leituras seguintes");
  assert.equal(attempts, 2);
  console.log("Google Sheets batching: batchGet de múltiplas abas, dedupe concorrente e durante voo, falha e recuperação verificados.");
}

void main();
