import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20260919193000_exam_content_versions.sql", import.meta.url), "utf8");
const service = readFileSync(new URL("../services/teacher-exams.ts", import.meta.url), "utf8");
const versionsRoute = readFileSync(new URL("../app/api/teacher-exams/[examId]/versions/route.ts", import.meta.url), "utf8");
const restoreRoute = readFileSync(new URL("../app/api/teacher-exams/[examId]/versions/[versionId]/restore/route.ts", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../components/teacher-exams-workspace.tsx", import.meta.url), "utf8");

assert.match(migration, /create table public\.exam_content_versions/i);
assert.match(migration, /references public\.exams\(id\) on delete restrict/i);
assert.match(migration, /unique \(exam_id, version\)/i);
assert.match(migration, /enable row level security/i);
assert.match(migration, /server_only_exam_content_versions/i);
assert.match(service, /function versionSnapshot/);
assert.match(service, /function inputFromExam/);
assert.match(service, /preserveCurrentExamContentVersion/);
assert.match(service, /assignmentGroups: \[\]/);
assert.match(service, /listTeacherExamContentVersions/);
assert.match(service, /restoreTeacherExamContentVersion/);
assert.match(service, /current\.hasResults/);
assert.match(service, /eq\("exam_id", input\.examId\)/);
assert.match(service, /eq\("id", input\.versionId\)/);
assert.match(service, /expectedVersion/);
assert.match(service, /saveExamContentVersion\(\{ actorId: input\.actorId, examId, reason: "criada"/);
assert.match(service, /reason: input\.intent === "publicar" \? "publicada" : "salva"/);
assert.match(versionsRoute, /getExamSession/);
assert.match(restoreRoute, /hasSameOriginRequest/);
assert.match(restoreRoute, /consumeRateLimit/);
assert.match(restoreRoute, /restoreTeacherExamContentVersion/);
assert.match(restoreRoute, /appendAuditEvent/);
assert.match(workspace, /Versões do conteúdo/);
assert.match(workspace, /A aplicação atual da prova será mantida/);
assert.match(workspace, /Provas já corrigidas ficam protegidas/);

console.log("Exam content version checks passed.");
