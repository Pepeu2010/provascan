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

const MANUAL_TRACKS: Array<Pick<ExamAudienceOption, "groupType" | "label">> = [
  { groupType: "EXATAS", label: "Exatas" },
  { groupType: "HUMANAS", label: "Humanas" },
  { groupType: "TECNICO", label: "Técnico" },
  { groupType: "CIENCIA_DE_DADOS", label: "Ciência de Dados" },
  { groupType: "ADS", label: "ADS" },
  { groupType: "MISTO", label: "Exatas e Humanas" },
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeCompact(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
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

function getTrackLabel(groupType: AudienceGroupType) {
  switch (groupType) {
    case "GERAL":
      return "";
    case "EXATAS":
      return "Exatas";
    case "HUMANAS":
      return "Humanas";
    case "TECNICO":
      return "Técnico";
    case "CIENCIA_DE_DADOS":
      return "Ciência de Dados";
    case "ADS":
      return "ADS";
    case "MISTO":
      return "Exatas e Humanas";
    case "INDEFINIDO":
      return "Revisar agrupamento";
    default:
      return "Turma individual";
  }
}

function createAudienceLabel(yearSegment: YearSegment, groupType: AudienceGroupType, className?: string) {
  if (groupType === "TURMA") {
    return className || "Turma individual";
  }

  if (yearSegment === "OUTROS") {
    return className || getTrackLabel(groupType);
  }

  const base = `${yearSegment}º ano`;
  const trackLabel = getTrackLabel(groupType);
  return trackLabel ? `${base} - ${trackLabel}` : base;
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

function detectSectionCode(compactName: string) {
  const patterns = ["3de", "3bc", "3a", "2acd", "2abd", "2ad", "2c", "2b", "1a", "1b", "1c", "1d", "1e"];
  return patterns.find((pattern) => compactName.startsWith(pattern)) ?? "";
}

function detectGroupType(className: string, yearSegment: YearSegment): AudienceGroupType {
  if (yearSegment === "1") {
    return "GERAL";
  }

  const normalized = normalizeText(className);
  const compact = normalizeCompact(className);
  const sectionCode = detectSectionCode(compact);

  if (
    compact.includes("analiseedesenvolvimentodesistemas") ||
    compact.includes("desenvolvimentodesistemas") ||
    /\bads\b/.test(normalized)
  ) {
    return "ADS";
  }

  if (compact.includes("cienciadedados") || compact.includes("cienciasdedados")) {
    return "CIENCIA_DE_DADOS";
  }

  if (compact.includes("tecnico")) {
    return "TECNICO";
  }

  if (compact.includes("exatasehumanas") || compact.includes("misto")) {
    return "MISTO";
  }

  if (compact.includes("humanas")) {
    return "HUMANAS";
  }

  if (compact.includes("exatas")) {
    return "EXATAS";
  }

  if (yearSegment === "2") {
    if (sectionCode === "2ad") return "TECNICO";
    if (sectionCode === "2b" || sectionCode === "2acd") return "HUMANAS";
    if (sectionCode === "2c" || sectionCode === "2abd") return "EXATAS";
  }

  return "INDEFINIDO";
}

export function deriveClassAudience(classroom: Pick<ClassRoom, "id" | "nome">): DerivedAudience {
  const yearSegment = detectYearSegment(classroom.nome);
  if (yearSegment === "OUTROS") {
    return {
      id: createAudienceId("OUTROS", "TURMA", slugify(classroom.id || classroom.nome)),
      label: createAudienceLabel("OUTROS", "TURMA", classroom.nome),
      groupType: "TURMA",
      requiresManualGrouping: false,
      yearSegment: "OUTROS",
    };
  }

  const groupType = detectGroupType(classroom.nome, yearSegment);
  const suffix = groupType === "INDEFINIDO" ? slugify(classroom.id || classroom.nome) : "";

  return {
    id: createAudienceId(yearSegment, groupType, suffix),
    label: createAudienceLabel(yearSegment, groupType, classroom.nome),
    groupType,
    requiresManualGrouping: groupType === "INDEFINIDO" && (yearSegment === "2" || yearSegment === "3"),
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
      audienceLabel: exam.audienceLabel || createAudienceLabel(exam.yearSegment, exam.groupType),
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
  const yearsPresent = new Set(
    classes.map((item) => deriveClassAudience(item).yearSegment).filter((item) => item === "1" || item === "2" || item === "3"),
  );

  if (!yearsPresent.size) {
    yearsPresent.add("1");
    yearsPresent.add("2");
    yearsPresent.add("3");
  }

  const options: ExamAudienceOption[] = [];
  if (yearsPresent.has("1")) {
    options.push({
      id: createAudienceId("1", "GERAL"),
      label: createAudienceLabel("1", "GERAL"),
      groupType: "GERAL",
      yearSegment: "1",
    });
  }

  (["2", "3"] as const).forEach((yearSegment) => {
    if (!yearsPresent.has(yearSegment)) {
      return;
    }

    MANUAL_TRACKS.forEach((track) => {
      options.push({
        id: createAudienceId(yearSegment, track.groupType),
        label: `${yearSegment}º ano - ${track.label}`,
        groupType: track.groupType,
        yearSegment,
      });
    });
  });

  const uniqueOptions = new Map(options.map((item) => [item.id, item] as const));
  return [...uniqueOptions.values()];
}

export function hasAmbiguousClasses(classes: ClassRoom[], yearSegment: Extract<YearSegment, "2" | "3">) {
  return classes.some((item) => {
    const audience = deriveClassAudience(item);
    return audience.yearSegment === yearSegment && audience.requiresManualGrouping;
  });
}
