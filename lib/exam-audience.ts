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

const FIXED_EXAM_AUDIENCES: ExamAudienceOption[] = [
  { id: "ANO-1-GERAL", label: "1º ano", groupType: "GERAL", yearSegment: "1" },
  { id: "ANO-2-EXATAS", label: "2º ano - Exatas", groupType: "EXATAS", yearSegment: "2" },
  { id: "ANO-2-HUMANAS", label: "2º ano - Humanas", groupType: "HUMANAS", yearSegment: "2" },
  { id: "ANO-2-TECNICO", label: "2º ano - Tecnico", groupType: "TECNICO", yearSegment: "2" },
  { id: "ANO-3-EXATAS", label: "3º ano - Exatas", groupType: "EXATAS", yearSegment: "3" },
  { id: "ANO-3-HUMANAS", label: "3º ano - Humanas", groupType: "HUMANAS", yearSegment: "3" },
  { id: "ANO-3-TECNICO", label: "3º ano - Tecnico", groupType: "TECNICO", yearSegment: "3" },
] as const;

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

function detectYearSegment(className: string): YearSegment {
  const normalized = normalizeText(className);

  if (/\b1[a-z]?\b/.test(normalized) || /\b1(?:\s*[a-z]{0,3})?\s*(?:ano|serie|ensino medio)\b/.test(normalized)) {
    return "1";
  }

  if (/\b2[a-z]?\b/.test(normalized) || /\b2(?:\s*[a-z]{0,3})?\s*(?:ano|serie|ensino medio)\b/.test(normalized)) {
    return "2";
  }

  if (/\b3[a-z]?\b/.test(normalized) || /\b3(?:\s*[a-z]{0,3})?\s*(?:ano|serie|ensino medio)\b/.test(normalized)) {
    return "3";
  }

  return "OUTROS";
}

function createFixedAudience(yearSegment: Extract<YearSegment, "1" | "2" | "3">, groupType: AudienceGroupType) {
  return FIXED_EXAM_AUDIENCES.find((item) => item.yearSegment === yearSegment && item.groupType === groupType) ?? null;
}

export function deriveClassAudience(classroom: Pick<ClassRoom, "id" | "nome">): DerivedAudience {
  const yearSegment = detectYearSegment(classroom.nome);

  if (yearSegment === "1") {
    return {
      ...createFixedAudience("1", "GERAL")!,
      requiresManualGrouping: false,
    };
  }

  if (yearSegment === "2" || yearSegment === "3") {
    return {
      id: createAudienceId(yearSegment, "INDEFINIDO", slugify(classroom.id || classroom.nome)),
      label: `${yearSegment}º ano - Revisar agrupamento`,
      groupType: "INDEFINIDO",
      requiresManualGrouping: true,
      yearSegment,
    };
  }

  return {
    id: createAudienceId("OUTROS", "TURMA", slugify(classroom.id || classroom.nome)),
    label: classroom.nome || "Turma individual",
    groupType: "TURMA",
    requiresManualGrouping: false,
    yearSegment: "OUTROS",
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
      audienceLabel: "Turma nao encontrada",
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

export function normalizeExam(
  exam: Exam | (Omit<Exam, "audienceId" | "audienceLabel" | "groupType" | "yearSegment"> & { turma?: string }),
  classes: ClassRoom[],
): Exam {
  if ("audienceId" in exam && typeof exam.audienceId === "string" && exam.audienceId.trim()) {
    return {
      ...exam,
      audienceLabel: exam.audienceLabel || exam.audienceId,
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
    subject: "subject" in exam && typeof exam.subject === "string" ? exam.subject : "",
    templateVersion: exam.templateVersion,
    titulo: exam.titulo,
    yearSegment: audience.yearSegment,
  };
}

export function normalizeExams(exams: Exam[], classes: ClassRoom[]) {
  return exams.map((exam) => normalizeExam(exam, classes));
}

function getYearForClass(classroom: ClassRoom | undefined) {
  if (!classroom) {
    return "OUTROS" as const;
  }

  return classroom.yearSegment ?? detectYearSegment(classroom.nome);
}

export function getStudentsForExam(exam: Exam | undefined, students: Student[], classes: ClassRoom[]) {
  if (!exam) {
    return students;
  }

  const classesById = new Map(classes.map((item) => [item.id, item] as const));

  if (exam.groupType === "TURMA") {
    return students.filter((student) => {
      const classroom = classesById.get(student.turma);
      return classroom ? deriveClassAudience(classroom).id === exam.audienceId : false;
    });
  }

  return students.filter((student) => {
    const classroom = classesById.get(student.turma);
    return getYearForClass(classroom) === exam.yearSegment;
  });
}

export function getRepresentativeClassForExam(exam: Exam | undefined, classes: ClassRoom[]) {
  if (!exam) {
    return null;
  }

  if (exam.groupType === "TURMA") {
    return classes.find((item) => deriveClassAudience(item).id === exam.audienceId) ?? null;
  }

  return classes.find((item) => getYearForClass(item) === exam.yearSegment) ?? null;
}

export function buildExamAudienceOptions(classes: ClassRoom[]) {
  const normalizedClasses = normalizeClasses(classes);
  const yearsPresent = new Set(normalizedClasses.map((item) => item.yearSegment));

  const options = FIXED_EXAM_AUDIENCES.filter((item) => yearsPresent.has(item.yearSegment));
  const otherClassOptions = normalizedClasses
    .filter((item) => item.yearSegment === "OUTROS")
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((item) => ({
      id: item.audienceId ?? createAudienceId("OUTROS", "TURMA", slugify(item.id || item.nome)),
      label: item.audienceLabel ?? item.nome,
      groupType: (item.groupType ?? "TURMA") as AudienceGroupType,
      yearSegment: item.yearSegment ?? "OUTROS",
    }));

  return [...options, ...otherClassOptions];
}

export function hasAmbiguousClasses(classes: ClassRoom[], yearSegment: Extract<YearSegment, "2" | "3">) {
  return classes.some((item) => detectYearSegment(item.nome) === yearSegment);
}
