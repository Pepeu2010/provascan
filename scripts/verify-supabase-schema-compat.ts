import assert from "node:assert/strict";
import { withTeacherExamSchemaFallback } from "../lib/supabase-schema-compat";

async function main() {
  const calls: string[] = [];
  const recovered = await withTeacherExamSchemaFallback(
  async () => {
    calls.push("modern");
    return { data: null, error: { message: "column exams.status does not exist" } };
  },
  async () => {
    calls.push("legacy");
    return { data: [{ id: "exam-1" }], error: null };
  },
  );

  assert.deepEqual(calls, ["modern", "legacy"]);
  assert.deepEqual(recovered.data, [{ id: "exam-1" }]);
  assert.equal(recovered.error, null);

  let legacyCalled = false;
  const unrelatedFailure = await withTeacherExamSchemaFallback(
  async () => ({ data: null, error: { message: "connection timeout" } }),
  async () => {
    legacyCalled = true;
    return { data: [], error: null };
  },
  );

  assert.equal(legacyCalled, false);
  assert.equal(unrelatedFailure.error?.message, "connection timeout");

  console.log("Supabase schema compatibility checks passed.");
}

void main();
