import type { ExternalExamTemplate } from "@/types/universal-exams";

type TemplateLibraryAction =
  | { at: string; name: string; type: "rename" }
  | { at: string; type: "favorite"; value: boolean }
  | { at: string; type: "archive" }
  | { at: string; id: string; type: "duplicate" }
  | { at: string; type: "used" };

export function sortTemplateLibrary(templates: ExternalExamTemplate[], includeArchived = false) {
  return templates
    .filter((template) => includeArchived || !template.archivedAt)
    .sort((left, right) => Number(right.isFavorite) - Number(left.isFavorite)
      || Date.parse(right.lastUsedAt ?? right.updatedAt) - Date.parse(left.lastUsedAt ?? left.updatedAt)
      || left.name.localeCompare(right.name, "pt-BR"));
}

export function applyTemplateLibraryAction(templates: ExternalExamTemplate[], templateId: string, action: TemplateLibraryAction) {
  const source = templates.find((template) => template.id === templateId);
  if (!source) return templates;
  if (action.type === "duplicate") {
    return [...templates, { ...source, archivedAt: null, createdAt: action.at, id: action.id, isFavorite: false, lastUsedAt: null, name: `${source.name} — cópia`, updatedAt: action.at }];
  }
  return templates.map((template) => {
    if (template.id !== templateId) return template;
    if (action.type === "rename") return { ...template, name: action.name.trim(), updatedAt: action.at };
    if (action.type === "favorite") return { ...template, isFavorite: action.value, updatedAt: action.at };
    if (action.type === "archive") return { ...template, archivedAt: action.at, updatedAt: action.at };
    return { ...template, lastUsedAt: action.at };
  });
}
