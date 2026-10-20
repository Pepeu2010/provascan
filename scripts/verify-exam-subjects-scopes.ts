import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canActInPedagogicalScope } from "../lib/pedagogical-scope-policy";

assert.equal(canActInPedagogicalScope("admin", false), true);
assert.equal(canActInPedagogicalScope("vice_diretor", false), true);
assert.equal(canActInPedagogicalScope("coordenador", true), true);
assert.equal(canActInPedagogicalScope("coordenador", false), false);
assert.equal(canActInPedagogicalScope("professor", true), true);
assert.equal(canActInPedagogicalScope("professor", false), false);

const subjects = readFileSync(new URL("../services/pedagogical-scopes.ts", import.meta.url), "utf8");
assert.match(subjects, /\.from\("subjects"\)/);
assert.match(subjects, /\.from\("pedagogical_scopes"\)/);
assert.match(subjects, /scopeAllowsExam/);

console.log("Exam subject and pedagogical scope foundation checks passed.");
