import type { AudienceGroupType, ClassRoom, Exam, Student, YearSegment } from "@/types/domain";

export type ExamAudienceOption = {
  id: string;
  label: string;
  groupType: AudienceGroupType;
  yearSegment: YearSegment;
};

type DerivedAudience = ExamAudienceOption & {
  requiresManualGrouping: boolean;
};

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

function createAudienceId(yearSegment: YearSegment, groupType: AudienceGroupType, suffix = "") {
  const base = `ANO-${yearSegment}-${groupType}`;
  return suffix ? `${base}-${suffix}` : base;
}

function createAudienceLabel(yearSegment: YearSegment, className?: string) {
  if (yearSegment === "1") {
    return "1º ano";
  }

  return className || "Turma individual";
}

function detectYearSegment(className: string): YearSegment {
  const normalized = normalizeText(className);

  const yearPatterns: Array<{ year: YearSegment; pattern: RegExp }> = [
    { year: "1", pattern: /\b1(?:\s*[a-z]{0,3})?\s*(?:ano|serie|ensino medio)\b/ },
    { year: "2", pattern: /\b2(?:\s*[a-z]{0,3})?\s*(?:ano|serie|ensino medio)\b/ },
    { year: "3", pattern: /\b3(?:\s*[a-z]{0,3})?\s*(?:ano|serie|ensino medio)\b/ },
  ];

  const matched = yearPatterns.find((item) => item.pattern.test(normalized));
  return matched?.year ?? "OUTROS";
}

export function deriveClassAudience(classroom: Pick<ClassRoom, "id" | "nome">): DerivedAudience {
  const yearSegment = detectYearSegment(classroom.nome);

  if (yearSegment === "1") {
    return {
      id: createAudienceId("1", "GERAL"),
      label: createAudienceLabel("1"),
      groupType: "GERAL",
      requiresManualGrouping: false,
      yearSegment: "1",
    };
  }

  return {
    id: createAudienceId(yearSegment, "TURMA", slugify(classroom.id || classroom.nome)),
    label: createAudienceLabel(yearSegment, classroom.nome),
    groupType: "TURMA",
    requiresManualGrouping: false,
    yearSegment,
  };
}

export function enrichClassRoom(classroom: ClassRoom): ClassRoom {
  const audience = deriveClassAudience(classroom);
  return {
    ...classroom,
    audienceId: audience.id,
    audienceLabel: audience.label,
    groupType: audience.groupType,
    requiresManualGrouping: audience.requiresManualGrouping,
    yearSegment: audience.yearSegment,
  };
}

export function normalizeClasses(classes: ClassRoom[]) {
  return classes.map(enrichClassRoom);
}

export function deriveExamAudienceFromLegacyClass(classroom?: Pick<ClassRoom, "id" | "nome"> | null) {
  if (!classroom) {
    return {
      audienceId: createAudienceId("OUTROS", "TURMA", "sem-turma"),
      audienceLabel: "Turma não encontrada",
      groupType: "TURMA" as const,
      yearSegment: "OUTROS" as const,
    };
  }

  const audience = deriveClassAudience(classroom);
  return {
    audienceId: audience.id,
    audienceLabel: audience.label,
    groupType: audience.groupType,
    yearSegment: audience.yearSegment,
  };
}

export function normalizeExam(exam: Exam | (Omit<Exam, "audienceId" | "audienceLabel" | "groupType" | "yearSegment"> & { turma?: string }), classes: ClassRoom[]): Exam {
  if ("audienceId" in exam && typeof exam.audienceId === "string" && exam.audienceId.trim()) {
    return {
      ...exam,
      audienceLabel: exam.audienceLabel || createAudienceLabel(exam.yearSegment),
    };
  }

  const legacyClassId = "turma" in exam ? exam.turma : "";
  const classroom = classes.find((item) => item.id === legacyClassId);
  const audience = deriveExamAudienceFromLegacyClass(classroom ?? null);

  return {
    alternativas: exam.alternativas,
    audienceId: audience.audienceId,
    audienceLabel: audience.audienceLabel,
    codigo: exam.codigo,
    data: exam.data,
    groupType: audience.groupType,
    id: exam.id,
    quantidadeQuestoes: exam.quantidadeQuestoes,
    templateVersion: exam.templateVersion,
    titulo: exam.titulo,
    yearSegment: audience.yearSegment,
  };
}

export function normalizeExams(exams: Exam[], classes: ClassRoom[]) {
  return exams.map((exam) => normalizeExam(exam, classes));
}

export function getStudentsForExam(exam: Exam | undefined, students: Student[], classes: ClassRoom[]) {
  if (!exam) {
    return students;
  }

  const classesById = new Map(classes.map((item) => [item.id, item] as const));
  return students.filter((student) => {
    const classroom = classesById.get(student.turma);
    if (!classroom) {
      return false;
    }

    const audience = deriveClassAudience(classroom);
    return audience.id === exam.audienceId;
  });
}

export function getRepresentativeClassForExam(exam: Exam | undefined, classes: ClassRoom[]) {
  if (!exam) {
    return null;
  }

  return classes.find((item) => deriveClassAudience(item).id === exam.audienceId) ?? null;
}

export function buildExamAudienceOptions(classes: ClassRoom[]) {
  const options = normalizeClasses(classes)
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((item) => ({
      id: item.audienceId ?? createAudienceId(item.yearSegment ?? "OUTROS", "TURMA", slugify(item.id || item.nome)),
      label: item.audienceLabel ?? createAudienceLabel(item.yearSegment ?? "OUTROS", item.nome),
      groupType: (item.groupType ?? "TURMA") as "GERAL" | "TURMA",
      yearSegment: item.yearSegment ?? "OUTROS",
    }));

  const uniqueOptions = new Map(options.map((item) => [item.id, item] as const));
  return [...uniqueOptions.values()];
}

export function hasAmbiguousClasses(classes: ClassRoom[], yearSegment: Extract<YearSegment, "2" | "3">) {
  void classes;
  void yearSegment;
  return false;
}
