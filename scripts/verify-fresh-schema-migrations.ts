import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationsDirectory = join(process.cwd(), "supabase", "migrations");
const rlsMigration = readFileSync(join(migrationsDirectory, "20260727225035_explicit_server_only_rls_policies.sql"), "utf8");
const subjectMigration = readFileSync(join(migrationsDirectory, "20260801000000_remove_subject_area.sql"), "utf8");
const teacherOwnedExamMigration = readFileSync(
  join(migrationsDirectory, "20260915170000_teacher_owned_exam_flow.sql"),
  "utf8",
);

assert.match(rlsMigration, /to_regclass\(format\('public\.%I', target_table\)\) is null/);
assert.match(subjectMigration, /to_regclass\('public\.grades'\) is not null/);
assert.match(
  teacherOwnedExamMigration,
  /add column if not exists subject text not null default ''[\s\S]*update public\.exams exam\s+set subject/,
);

console.log("Fresh Supabase schema migrations: OK");
