import assert from "node:assert/strict";
import { readGoogleSheetsTableBatch } from "../lib/google-sheets-batching";

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
  console.log("Google Sheets batching: uma chamada para várias abas, remoção de duplicadas, escape de nomes e conjunto vazio verificados.");
}

void main();
