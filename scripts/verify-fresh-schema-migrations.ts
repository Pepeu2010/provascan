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
const mfaExemptionMigration = readFileSync(
  join(migrationsDirectory, "20260916205903_add_per_user_mfa_exemption.sql"),
  "utf8",
);
const examFoundationMigration = readFileSync(
  join(migrationsDirectory, "20260917113000_exam_subjects_and_pedagogical_scopes.sql"),
  "utf8",
);
const classOnlyScopeMigration = readFileSync(
  join(migrationsDirectory, "20260925120000_class_only_pedagogical_scopes.sql"),
  "utf8",
);

assert.match(rlsMigration, /to_regclass\(format\('public\.%I', target_table\)\) is null/);
assert.match(subjectMigration, /to_regclass\('public\.grades'\) is not null/);
assert.match(
  teacherOwnedExamMigration,
  /add column if not exists subject text not null default ''[\s\S]*update public\.exams exam\s+set subject/,
);
assert.match(mfaExemptionMigration, /add column if not exists mfa_exempt boolean not null default false/);
assert.doesNotMatch(mfaExemptionMigration, /default true/);
assert.match(examFoundationMigration, /create table if not exists public\.subjects/);
assert.match(examFoundationMigration, /add column if not exists subject_id text references public\.subjects\(id\) on delete restrict/);
assert.match(examFoundationMigration, /create table if not exists public\.pedagogical_scopes/);
assert.match(examFoundationMigration, /pedagogical_scopes_active_unique_idx/);
assert.doesNotMatch(examFoundationMigration, /update public\.exams/i);
assert.match(classOnlyScopeMigration, /alter column subject_id drop not null/);
assert.match(classOnlyScopeMigration, /unique index if not exists pedagogical_scopes_active_class_only_unique_idx/);

console.log("Fresh Supabase schema migrations: OK");
