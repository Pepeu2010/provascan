import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canActInPedagogicalScope } from "../lib/pedagogical-scope-policy";

assert.equal(canActInPedagogicalScope("admin", false), true);
assert.equal(canActInPedagogicalScope("vice_diretor", false), true);
assert.equal(canActInPedagogicalScope("coordenador", true), true);
assert.equal(canActInPedagogicalScope("coordenador", false), false);
assert.equal(canActInPedagogicalScope("professor", true), true);
assert.equal(canActInPedagogicalScope("professor", false), false);

const migration = readFileSync(new URL("../supabase/migrations/20260917113000_exam_subjects_and_pedagogical_scopes.sql", import.meta.url), "utf8");
assert.match(migration, /create table if not exists public\.subjects/);
assert.match(migration, /add column if not exists subject_id text references public\.subjects\(id\) on delete restrict/);
assert.match(migration, /create table if not exists public\.pedagogical_scopes/);
assert.match(migration, /on delete restrict/);
assert.match(migration, /pedagogical_scopes_active_unique_idx/);
assert.match(migration, /where active/);
assert.match(migration, /server_only_subjects/);
assert.match(migration, /server_only_pedagogical_scopes/);
assert.doesNotMatch(migration, /update public\.exams/i);

console.log("Exam subject and pedagogical scope foundation checks passed.");
