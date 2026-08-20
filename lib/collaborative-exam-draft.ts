export type CollaborativeExamDraftSection = {
  questionCount: string;
  subject: string;
  teacherId: string;
};

export type CollaborativeExamDraft = {
  alternatives: string[];
  date: string;
  sections: CollaborativeExamDraftSection[];
  title: string;
};

export function validateCollaborativeExamDraft(draft: CollaborativeExamDraft): string | null {
  if (!draft.title.trim()) return "Informe o título da prova.";
  if (!draft.date) return "Informe a data da prova.";
  if (draft.alternatives.length < 2) return "Informe ao menos duas alternativas válidas.";
  if (!draft.sections.length) return "Selecione ao menos um professor responsável.";
  if (draft.sections.some((section) => !section.teacherId)) return "Selecione um professor para cada matéria.";
  if (draft.sections.some((section) => !section.subject.trim())) return "Informe a matéria de cada professor selecionado.";
  if (draft.sections.some((section) => !Number.isInteger(Number(section.questionCount)) || Number(section.questionCount) < 1 || Number(section.questionCount) > 200)) {
    return "Informe uma quantidade válida de questões para cada matéria.";
  }
  return null;
}
