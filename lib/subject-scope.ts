import { isPrivilegedRole } from "@/lib/access-control";
import type { AppDataState } from "@/lib/app-data";
import type { AuthSessionUser, SafeAuthUser } from "@/types/auth";
import type { CorrectionSession, Exam } from "@/types/domain";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function slugify(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SUBJECT_DEFINITIONS = [
  { aliases: ["artes", "arte"], key: "artes", label: "Artes" },
  { aliases: ["biologia"], key: "biologia", label: "Biologia" },
  { aliases: ["ciencias", "ciencias da natureza", "ciencia"], key: "ciencias", label: "Ciencias" },
  { aliases: ["educacao fisica", "ed fisica", "edf"], key: "educacao-fisica", label: "Educacao Fisica" },
  { aliases: ["filosofia"], key: "filosofia", label: "Filosofia" },
  { aliases: ["fisica"], key: "fisica", label: "Fisica" },
  { aliases: ["geografia"], key: "geografia", label: "Geografia" },
  { aliases: ["historia"], key: "historia", label: "Historia" },
  { aliases: ["ingles", "lingua inglesa", "english"], key: "ingles", label: "Ingles" },
  { aliases: ["lingua portuguesa", "portugues", "lp"], key: "lingua-portuguesa", label: "Lingua Portuguesa" },
  { aliases: ["matematica", "mat"], key: "matematica", label: "Matematica" },
  { aliases: ["quimica"], key: "quimica", label: "Quimica" },
  { aliases: ["redacao", "producao textual", "producao de texto"], key: "redacao", label: "Redacao" },
  { aliases: ["sociologia"], key: "sociologia", label: "Sociologia" },
] as const;

const SUBJECT_ALIAS_MAP = new Map<string, string>(
  SUBJECT_DEFINITIONS.flatMap((definition) =>
    definition.aliases.map((alias) => [normalizeText(alias), definition.key] as const),
  ),
);

const SUBJECT_LABEL_MAP = new Map<string, string>(
  SUBJECT_DEFINITIONS.map((definition) => [definition.key, definition.label] as const),
);

export const SUPPORTED_SUBJECTS = SUBJECT_DEFINITIONS.map((definition) => definition.label);

export function normalizeSubject(value: string | null | undefined) {
  const normalized = normalizeText(value ?? "");
  if (!normalized) {
    return null;
  }

  const mapped = SUBJECT_ALIAS_MAP.get(normalized);
  if (mapped) {
    return mapped;
  }

  return slugify(normalized);
}

export function getSubjectLabel(subject: string | null | undefined) {
  const normalized = normalizeSubject(subject);
  if (!normalized) {
    return "";
  }

  const label = SUBJECT_LABEL_MAP.get(normalized);
  if (label) {
    return label;
  }

  return normalized
    .split("-")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export function canManageAllSubjects(role: string) {
  return isPrivilegedRole(role);
}

export function requireScopedSubject(user: Pick<AuthSessionUser | SafeAuthUser, "role" | "subject">) {
  if (canManageAllSubjects(user.role)) {
    return null;
  }

  return normalizeSubject(user.subject);
}

function examMatchesSubject(exam: Exam, subject: string) {
  return normalizeSubject(exam.subject) === subject;
}

function correctionMatchesSubject(correction: CorrectionSession, subject: string) {
  return examMatchesSubject(correction.prova, subject);
}

export function filterAppDataForSubject(data: AppDataState, subject: string | null) {
  if (!subject) {
    return data;
  }

  const exams = data.exams.filter((item) => examMatchesSubject(item, subject));
  const examIds = new Set(exams.map((item) => item.id));

  return {
    ...data,
    answerKeys: data.answerKeys.filter((item) => examIds.has(item.provaId)),
    correctionRules: data.correctionRules.filter((item) => examIds.has(item.provaId)),
    corrections: data.corrections.filter((item) => correctionMatchesSubject(item, subject)),
    exams,
  } satisfies AppDataState;
}

export function mergeScopedAppData(existing: AppDataState, incoming: AppDataState, subject: string | null) {
  if (!subject) {
    return incoming;
  }

  const scopedIncomingExams = incoming.exams.map((item) => ({
    ...item,
    subject: getSubjectLabel(subject),
  }));
  const scopedExamIds = new Set(scopedIncomingExams.map((item) => item.id));

  return {
    ...existing,
    answerKeys: [
      ...existing.answerKeys.filter((item) => {
        const exam = existing.exams.find((candidate) => candidate.id === item.provaId);
        return !exam || !examMatchesSubject(exam, subject);
      }),
      ...incoming.answerKeys.filter((item) => scopedExamIds.has(item.provaId)),
    ],
    correctionRules: [
      ...existing.correctionRules.filter((item) => {
        const exam = existing.exams.find((candidate) => candidate.id === item.provaId);
        return !exam || !examMatchesSubject(exam, subject);
      }),
      ...incoming.correctionRules.filter((item) => scopedExamIds.has(item.provaId)),
    ],
    corrections: [
      ...existing.corrections.filter((item) => !correctionMatchesSubject(item, subject)),
      ...incoming.corrections
        .filter((item) => scopedExamIds.has(item.correction.provaId))
        .map((item) => ({
          ...item,
          prova: {
            ...item.prova,
            subject: getSubjectLabel(subject),
          },
        })),
    ],
    exams: [
      ...existing.exams.filter((item) => !examMatchesSubject(item, subject)),
      ...scopedIncomingExams,
    ],
    teacherProfile: incoming.teacherProfile,
  } satisfies AppDataState;
}
