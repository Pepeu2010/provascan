import assert from "node:assert/strict";
import { assertUniqueGoogleSheetsKeys, GoogleSheetsConstraintError, mergeGoogleSheetsUpsert } from "../lib/google-sheets-row-integrity";

const initial = [{ exam_id: "00012", question_number: 1, answer: "A" }];
assertUniqueGoogleSheetsKeys(initial, ["exam_id", "question_number"], "answer_keys");
assert.throws(() => assertUniqueGoogleSheetsKeys([...initial, { ...initial[0] }], ["exam_id", "question_number"], "answer_keys"), GoogleSheetsConstraintError);
assert.throws(() => assertUniqueGoogleSheetsKeys([{ id: null }], ["id"], "students"), GoogleSheetsConstraintError);
assert.deepEqual(mergeGoogleSheetsUpsert(initial, [{ exam_id: "00012", question_number: 1, answer: "B" }], ["exam_id", "question_number"], false, "answer_keys"), [{ exam_id: "00012", question_number: 1, answer: "B" }]);
assert.deepEqual(mergeGoogleSheetsUpsert(initial, [{ exam_id: "00012", question_number: 1, answer: "B" }], ["exam_id", "question_number"], true, "answer_keys"), initial);
assert.throws(() => mergeGoogleSheetsUpsert([], [{ id: "x" }, { id: "x" }], ["id"], false, "students"), GoogleSheetsConstraintError);

console.log("Chaves únicas, chaves compostas, inserts duplicados e upserts compatíveis verificados.");
