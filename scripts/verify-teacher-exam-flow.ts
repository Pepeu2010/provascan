import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseImportedExamText } from "../lib/exam-import-parser";
import { defaultQuestion, validateExamForPublication } from "../lib/teacher-exam-validation";

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

const collectionRoute = readFileSync(new URL("../app/api/teacher-exams/route.ts", import.meta.url), "utf8");
const itemRoute = readFileSync(new URL("../app/api/teacher-exams/[examId]/route.ts", import.meta.url), "utf8");
const service = readFileSync(new URL("../services/teacher-exams.ts", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../components/teacher-exams-workspace.tsx", import.meta.url), "utf8");
const transaction = readFileSync(new URL("../supabase/migrations/20260917143000_teacher_exam_publication_transaction.sql", import.meta.url), "utf8");
assert.match(collectionRoute, /actorId: session\.id/);
assert.match(itemRoute, /actorId: session\.id/);
assert.match(service, /\.eq\("creator_id", input\.actorId\)/);
assert.match(service, /não pertence a você/);
assert.match(workspace, /Salvar rascunho/);
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
assert.match(workspace, /Isso fica somente nesta prova; não cria um cadastro novo/);
assert.match(workspace, /wholeYearLabel/);
assert.match(workspace, /Duplicar prova/);
assert.match(service, /resolveSubjectSnapshot/);
assert.match(service, /validateNewExamAssignmentPairs/);
assert.doesNotMatch(service, /throw new Error\("Selecione uma disciplina válida\."\)/);
assert.doesNotMatch(service, /Defina pelo menos uma turma responsável/);
assert.match(service, /create_teacher_exam_transaction/);
assert.match(transaction, /insert into public\.exam_assignments/);
assert.match(transaction, /insert into public\.audit_log_internal/);
assert.doesNotMatch(workspace, /Enviar para (?:aprovação|conferência|gestão)/i);
console.log("Teacher-owned exam flow checks passed.");
