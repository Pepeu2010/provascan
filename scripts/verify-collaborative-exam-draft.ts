import assert from "node:assert/strict";
import { validateCollaborativeExamDraft } from "../lib/collaborative-exam-draft";

const completeDraft = {
  alternatives: ["A", "B", "C", "D", "E"],
  date: "2026-08-20",
  sections: [{ questionCount: "10", subject: "Matemática", teacherId: "teacher-1" }],
  title: "Avaliação diagnóstica",
};

assert.equal(validateCollaborativeExamDraft({ ...completeDraft, title: "  " }), "Informe o título da prova.");
assert.equal(validateCollaborativeExamDraft({ ...completeDraft, alternatives: ["A"] }), "Informe ao menos duas alternativas válidas.");
assert.equal(validateCollaborativeExamDraft({ ...completeDraft, sections: [] }), "Selecione ao menos um professor responsável.");
assert.equal(validateCollaborativeExamDraft({ ...completeDraft, sections: [{ ...completeDraft.sections[0], subject: "" }] }), "Informe a matéria de cada professor selecionado.");
assert.equal(validateCollaborativeExamDraft({ ...completeDraft, sections: [{ ...completeDraft.sections[0], questionCount: "0" }] }), "Informe uma quantidade válida de questões para cada matéria.");
assert.equal(validateCollaborativeExamDraft(completeDraft), null);

console.log("Validação do rascunho de prova colaborativa: OK");
