import type { Student } from "@/types/domain";

export type StudentCandidate = { score: number; student: Student };

export function findStudentCandidates(query: string, students: Student[], limit = 5): StudentCandidate[] {
  const normalizedQuery = normalizePersonText(query);
  if (!normalizedQuery) return [];
  return students
    .filter((student) => student.status === "Ativo")
    .map((student) => ({ score: similarity(normalizedQuery, normalizePersonText(student.nome)), student }))
    .filter((candidate) => candidate.score >= 0.42)
    .sort((left, right) => right.score - left.score || left.student.nome.localeCompare(right.student.nome, "pt-BR"))
    .slice(0, limit);
}

export function findStudentCandidatesInText(rawText: string, students: Student[], limit = 5): StudentCandidate[] {
  const normalizedText = normalizePersonText(rawText);
  const exact = students
    .filter((student) => student.status === "Ativo" && normalizedText.includes(normalizePersonText(student.nome)))
    .map((student) => ({ score: 1, student }));
  if (exact.length) return exact.slice(0, limit);
  const nameLine = rawText.split(/\r?\n/).find((line) => /(?:nome|aluno)\s*:/i.test(line));
  return findStudentCandidates(nameLine?.replace(/^.*?:/, "") ?? rawText, students, limit);
}

export function normalizePersonText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function similarity(query: string, candidate: string) {
  if (candidate === query) return 1;
  if (candidate.includes(query) || query.includes(candidate)) return Math.min(0.95, 0.65 + Math.min(query.length, candidate.length) / Math.max(query.length, candidate.length) * 0.3);
  const queryTokens = new Set(query.split(" ").filter(Boolean));
  const candidateTokens = new Set(candidate.split(" ").filter(Boolean));
  const overlap = [...queryTokens].filter((token) => candidateTokens.has(token)).length;
  return overlap / Math.max(queryTokens.size, candidateTokens.size, 1);
}
