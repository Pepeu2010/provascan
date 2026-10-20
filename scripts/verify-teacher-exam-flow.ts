import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseImportedExamText } from "../lib/exam-import-parser";
import { defaultQuestion, validateExamForPublication } from "../lib/teacher-exam-validation";
import { encodeGoogleSheetsTableValues } from "../lib/google-sheets-codec";
import { GOOGLE_SHEETS_SCHEMA } from "../lib/google-sheets-schema";
import { buildTeacherExamContentVersionRow, buildTeacherExamRow } from "../lib/teacher-exam-row";

const imported = parseImportedExamText(`Avaliação de Ciências
Disciplina: Ciências
1. Qual é o planeta vermelho?
A) Terra
B) Marte
C) Vênus
2. A água ferve a 100 graus?
A) Sim
B) Não
Gabarito
1 - B
2 - A`, "arquivo");
assert.equal(imported.title, "Avaliação de Ciências");
assert.equal(imported.subject, "Ciências");
assert.equal(imported.questions.length, 2);
assert.deepEqual(imported.questions[0].correctAnswers, ["Marte"]);
assert.deepEqual(imported.questions[1].correctAnswers, ["Sim"]);
assert.equal(imported.questions[0].topic, "");

const validExam = {
  audienceId: "turma-1",
  audienceLabel: "1º Ano A",
  description: "",
  estimatedDuration: 50,
  examDate: "2026-09-20",
  groupType: "TURMA",
  instructions: "Leia com atenção.",
  period: "1º Bimestre",
  questions: [{ ...defaultQuestion(1), alternatives: ["Terra", "Marte"], correctAnswers: ["Marte"], prompt: "Qual é o planeta vermelho?" }],
  subject: "Ciências",
  subjectId: null,
  assignmentGroups: [],
  title: "Avaliação",
  yearSegment: "1",
};
assert.deepEqual(validateExamForPublication(validExam), []);
assert.deepEqual(validateExamForPublication({ ...validExam, title: "" }), []);
assert.match(validateExamForPublication({ ...validExam, questions: [{ ...validExam.questions[0], correctAnswers: [] }] })[0], /resposta correta/i);
assert.deepEqual(validateExamForPublication({ ...validExam, subject: "", subjectId: null, audienceId: "", audienceLabel: "", assignmentGroups: [] }), []);

const draftRow = buildTeacherExamRow("teacher-test", "Professor Teste", "exam-test", validExam, "rascunho", {}, "2026-10-19T12:00:00.000Z");
const examsSchema = GOOGLE_SHEETS_SCHEMA.exams;
assert.ok(examsSchema);
assert.deepEqual(
  encodeGoogleSheetsTableValues(Object.keys(examsSchema.columns), [draftRow], examsSchema.columns)[1].length,
  Object.keys(examsSchema.columns).length,
  "a criação manual precisa preencher todas as colunas exigidas da aba exams",
);
assert.equal(draftRow.source_type, "manual");
assert.equal(draftRow.import_processing_status, "nao_aplicavel");
assert.equal(draftRow.created_at, "2026-10-19T12:00:00.000Z");
assert.equal(draftRow.updated_at, "2026-10-19T12:00:00.000Z");
assert.equal(draftRow.version, 1);

const contentVersionRow = buildTeacherExamContentVersionRow({
  actorId: "teacher-test",
  examId: "exam-test",
  id: "version-test",
  reason: "salva",
  snapshot: validExam,
  version: 2,
  createdAt: "2026-10-19T12:00:00.000Z",
});
const contentVersionsSchema = GOOGLE_SHEETS_SCHEMA.exam_content_versions;
assert.ok(contentVersionsSchema);
assert.equal(
  encodeGoogleSheetsTableValues(Object.keys(contentVersionsSchema.columns), [contentVersionRow], contentVersionsSchema.columns)[1].length,
  Object.keys(contentVersionsSchema.columns).length,
  "preservar uma versão anterior deve preencher todas as colunas exigidas da aba exam_content_versions",
);
assert.equal(contentVersionRow.created_at, "2026-10-19T12:00:00.000Z");

const collectionRoute = readFileSync(new URL("../app/api/teacher-exams/route.ts", import.meta.url), "utf8");
const itemRoute = readFileSync(new URL("../app/api/teacher-exams/[examId]/route.ts", import.meta.url), "utf8");
const service = readFileSync(new URL("../services/teacher-exams.ts", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../components/teacher-exams-workspace.tsx", import.meta.url), "utf8");
const audienceRoute = readFileSync(new URL("../app/api/teacher-exams/audience/route.ts", import.meta.url), "utf8");
const assignments = readFileSync(new URL("../services/exam-assignments.ts", import.meta.url), "utf8");
assert.match(collectionRoute, /actorId: session\.id/);
assert.match(itemRoute, /actorId: session\.id/);
assert.match(service, /\.eq\("creator_id", input\.actorId\)/);
assert.match(service, /não pertence a você/);
assert.match(workspace, /Salvar rascunho/);
assert.match(workspace, /const responseText = await response\.text\(\)/);
assert.match(workspace, /Recarregue a lista antes de tentar novamente/);
assert.match(workspace, /Publicar prova/);
assert.match(workspace, /Para quem é esta prova/);
assert.match(workspace, /wholeYearLabel/);
assert.match(workspace, /completeQuestionsUntil/);
assert.match(workspace, /\[10, 20, 45, 90\]/);
assert.match(workspace, /Completar até/);
assert.match(workspace, /Colar prova completa com gabarito/);
assert.match(workspace, /parseImportedExamText/);
assert.match(workspace, /Cole o gabarito de uma vez/);
assert.match(workspace, /Preencher gabarito/);
assert.match(workspace, /Conteúdo da questão/);
assert.match(service, /topic: question\.topic\.trim\(\)/);
assert.match(workspace, /Os campos abaixo não bloqueiam a criação da prova/);
assert.match(workspace, /Opcional — aparece somente nesta prova; não é um cadastro/);
assert.doesNotMatch(workspace, /Use uma disciplina cadastrada para definir turmas e publicar/);
assert.match(workspace, /aparece somente nesta prova; não é um cadastro/);
assert.match(workspace, /Escolher professor e turmas/);
assert.doesNotMatch(workspace, /subjectId=\$\{encodeURIComponent/);
assert.doesNotMatch(workspace, /const hasSubject = Boolean\(draft\.subjectId\)/);
assert.doesNotMatch(workspace, /Turma principal/);
assert.match(workspace, /wholeYearLabel/);
assert.match(workspace, /Duplicar prova/);
assert.match(service, /validateNewExamAssignmentPairs/);
assert.match(itemRoute, /actorRole: session\.role/);
assert.match(service, /syncExamAssignments\(\{ actorId: input\.actorId, actorRole: input\.actorRole/);
assert.doesNotMatch(service, /resolveSubjectSnapshot/);
assert.doesNotMatch(service, /selecione uma disciplina da escola/i);
assert.match(service, /subjectId: null/);
assert.match(audienceRoute, /getAssignableAudience\(\{ actorId: session\.id, actorRole: session\.role \}\)/);
assert.doesNotMatch(audienceRoute, /subjectId/);
assert.match(assignments, /canActOnClassScope/);
assert.match(assignments, /getAssignableAudience\(input: \{ actorId: string; actorRole: UserRole \}\)/);
assert.doesNotMatch(service, /throw new Error\("Selecione uma disciplina válida\."\)/);
assert.doesNotMatch(service, /Defina pelo menos uma turma responsável/);
assert.match(service, /withOperationalWriteLock/);
assert.match(service, /export function updateTeacherExam[\s\S]*?return withOperationalWriteLock/);
assert.match(service, /function preserveCurrentExamContentVersion[\s\S]*?buildTeacherExamContentVersionRow/);
assert.match(service, /exam_sections"\)\.update\(\{ question_count:[^}]*updated_at:/);
assert.match(service, /exam_assignments/);
assert.match(service, /audit_log_internal/);
assert.doesNotMatch(service, /\.rpc\(/);
assert.match(service, /print_options/);
assert.match(workspace, /ExamPresentationControls/);
assert.doesNotMatch(workspace, /Enviar para (?:aprovação|conferência|gestão)/i);
console.log("Teacher-owned exam flow checks passed.");
