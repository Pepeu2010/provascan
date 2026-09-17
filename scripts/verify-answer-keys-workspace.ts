import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { TeacherExam } from "../types/teacher-exams";

const helperUrl = new URL("../lib/answer-key-library.ts", import.meta.url);
assert.equal(existsSync(fileURLToPath(helperUrl)), true, "A central de gabaritos precisa de regras próprias e testáveis.");

async function main() {
const { buildAnswerKeySummary, filterAnswerKeyExams } = await import("../lib/answer-key-library");

function exam(overrides: Partial<TeacherExam> = {}): TeacherExam {
  return {
    appliedAt: null,
    audienceId: "turma-1",
    audienceLabel: "1A",
    createdAt: "2026-09-16T12:00:00.000Z",
    creatorId: "teacher-1",
    creatorName: "Professor Teste",
    description: "",
    estimatedDuration: 50,
    examDate: "2026-09-20",
    groupType: "GERAL",
    hasResults: false,
    id: "exam-1",
    importProcessingError: null,
    importProcessingStatus: "nao_aplicavel",
    importedAt: null,
    instructions: "",
    legacyContributors: [],
    needsReview: false,
    originalFileMimeType: null,
    originalFileName: null,
    originalFileSize: null,
    period: "1º Bimestre",
    publishedAt: "2026-09-16T12:30:00.000Z",
    questions: [
      { alternatives: ["3", "4", "5", "6"], annulled: false, correctAnswers: ["4"], correctionCriteria: "", correctionNotes: "", id: "q1", imagePath: null, needsReview: false, position: 1, prompt: "Quanto é 2 + 2?", type: "multipla_escolha", weight: 1 },
      { alternatives: [], annulled: false, correctAnswers: [], correctionCriteria: "Explica o raciocínio corretamente.", correctionNotes: "", id: "q2", imagePath: null, needsReview: false, position: 2, prompt: "Explique.", type: "discursiva", weight: 2 },
    ],
    sourceType: "manual",
    status: "publicada",
    subject: "Matemática",
    title: "Avaliação de Matemática",
    updatedAt: "2026-09-16T12:30:00.000Z",
    version: 1,
    yearSegment: "1",
    ...overrides,
  };
}

const complete = exam();
assert.deepEqual(buildAnswerKeySummary(complete), {
  annulled: 0,
  answered: 2,
  complete: true,
  pending: 0,
  questionCount: 2,
  totalWeight: 3,
});

const incomplete = exam({
  id: "exam-2",
  questions: [{ ...complete.questions[0], correctAnswers: [], needsReview: true }],
  status: "rascunho",
  subject: "Ciências",
  title: "Rascunho de Ciências",
});
assert.equal(buildAnswerKeySummary(incomplete).complete, false);
assert.deepEqual(filterAnswerKeyExams([complete, incomplete], { query: "matemática", readiness: "prontos", subject: "todas" }).map((item: TeacherExam) => item.id), ["exam-1"]);
assert.deepEqual(filterAnswerKeyExams([complete, incomplete], { query: "", readiness: "incompletos", subject: "todas" }).map((item: TeacherExam) => item.id), ["exam-2"]);

const workspaceUrl = new URL("../components/answer-keys-workspace.tsx", import.meta.url);
assert.equal(existsSync(fileURLToPath(workspaceUrl)), true, "Gabaritos precisa de uma interface dedicada em vez do modo reduzido de Provas.");
const page = readFileSync(new URL("../app/dashboard/gabaritos/page.tsx", import.meta.url), "utf8");
const workspace = readFileSync(workspaceUrl, "utf8");
assert.match(page, /AnswerKeysWorkspace/);
assert.match(workspace, /Central de gabaritos/);
assert.match(workspace, /Visualizar gabarito/);
assert.match(workspace, /Gerar cartão-resposta/);
assert.match(workspace, /Respostas protegidas/);
assert.match(workspace, /answer-key-detail__message/);
assert.doesNotMatch(workspace, /Gabaritos das suas provas/);

console.log("Answer-key workspace checks passed: dedicated library, protected answers, filters, and print actions are present.");
}

void main();
