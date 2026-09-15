import assert from "node:assert/strict";
import { applyTemplateLibraryAction, sortTemplateLibrary } from "../lib/external-template-actions";
import { DEFAULT_UNIVERSAL_GRADING_RULES } from "../services/universal-grading-rules";
import type { ExternalExamTemplate } from "../types/universal-exams";

const base = {
  answerKey: ["A"], archivedAt: null, createdAt: "2026-09-10T00:00:00.000Z", gradingRules: DEFAULT_UNIVERSAL_GRADING_RULES,
  id: "one", isFavorite: false, lastUsedAt: null, name: "Modelo 1",
  structure: { alternatives: ["A", "B"], columnCount: 1, confidence: 1, source: "manual" as const, subjects: [{ id: "g", name: "Geral", questionStart: 1, questionEnd: 1 }], totalQuestions: 1 },
  updatedAt: "2026-09-10T00:00:00.000Z",
};
let templates: ExternalExamTemplate[] = [base, { ...base, id: "two", isFavorite: true, name: "Favorito", updatedAt: "2026-09-09T00:00:00.000Z" }];
assert.equal(sortTemplateLibrary(templates)[0].id, "two");
templates = applyTemplateLibraryAction(templates, "one", { type: "rename", name: "Novo nome", at: "2026-09-14T20:00:00.000Z" });
assert.equal(templates[0].name, "Novo nome");
templates = applyTemplateLibraryAction(templates, "one", { type: "favorite", value: true, at: "2026-09-14T20:01:00.000Z" });
assert.equal(templates[0].isFavorite, true);
templates = applyTemplateLibraryAction(templates, "one", { type: "archive", at: "2026-09-14T20:02:00.000Z" });
assert.equal(sortTemplateLibrary(templates).some((item) => item.id === "one"), false);
const duplicated = applyTemplateLibraryAction(templates, "two", { type: "duplicate", id: "three", at: "2026-09-14T20:03:00.000Z" });
assert.equal(duplicated.find((item) => item.id === "three")?.name, "Favorito — cópia");

console.log("External template actions verification passed.");
