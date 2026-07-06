import { google, sheets_v4 } from "googleapis";
import { z } from "zod";
import { cloneDefaultAppData, type AppDataState } from "@/lib/app-data";
import { classes, correctionSessions, exams, students, teacherProfile } from "@/lib/mock-data";
import { normalizeClasses } from "@/lib/exam-audience";
import type {
  ClassRoom,
  CorrectionSession,
  Exam,
  ExamCorrectionRule,
  Student,
  TeacherProfile,
} from "@/types/domain";
import type { SheetsUserRecord } from "@/types/auth";

const USERS_RANGE_COLUMNS = "A:H";
const STUDENTS_RANGE_COLUMNS = "A:E";
const CLASSES_RANGE_COLUMNS = "A:I";
const EXAMS_RANGE_COLUMNS = "A:L";
const ANSWER_KEYS_RANGE_COLUMNS = "A:C";
const CORRECTION_RULES_RANGE_COLUMNS = "A:G";
const CORRECTIONS_RANGE_COLUMNS = "A:X";
const CONFIG_RANGE_COLUMNS = "A:B";

const REQUIRED_USER_HEADERS = ["id", "nome", "email", "senha", "perfil", "ativo", "trocar_senha"] as const;
const REQUIRED_STUDENT_BASE_HEADERS = ["id", "nome", "turma", "ra"] as const;
const REQUIRED_CLASS_HEADERS = [
  "id",
  "nome",
  "professor",
  "ano",
  "periodo",
  "audience_id",
  "audience_label",
  "group_type",
  "year_segment",
] as const;
const REQUIRED_EXAM_HEADERS = [
  "id",
  "titulo",
  "disciplina",
  "audience_id",
  "audience_label",
  "group_type",
  "year_segment",
  "quantidade_questoes",
  "alternativas",
  "data",
  "codigo",
  "template_version",
] as const;
const REQUIRED_ANSWER_KEY_HEADERS = ["prova_id", "questao", "resposta_correta"] as const;
const REQUIRED_CORRECTION_RULE_HEADERS = [
  "prova_id",
  "nota_maxima",
  "arredondamento_casas",
  "peso_padrao",
  "pesos_por_questao",
  "questoes_anuladas",
  "modo_questao_anulada",
] as const;
const REQUIRED_CORRECTION_HEADERS = [
  "id",
  "prova_id",
  "aluno_id",
  "nome_detectado",
  "nota",
  "acertos",
  "erros",
  "em_branco",
  "multiplas_marcacoes",
  "anuladas",
  "percentual",
  "data",
  "imagem",
  "tempo_correcao",
  "metodo_identificacao",
  "aluno_json",
  "prova_json",
  "turma_json",
  "respostas_json",
  "confianca_ocr",
  "imagem_processada",
  "observacoes_json",
  "identificacao_json",
] as const;
const REQUIRED_CONFIG_HEADERS = ["key", "value"] as const;

const CONFIG_KEYS = {
  teacherEmail: "teacher_email",
  teacherName: "teacher_nome",
  teacherSchool: "teacher_escola",
} as const;

const envSchema = z.object({
  GOOGLE_SHEETS_CLIENT_EMAIL: z.string().email(),
  GOOGLE_SHEETS_PRIVATE_KEY: z.string().min(1),
  GOOGLE_SHEETS_SPREADSHEET_ID: z.string().min(1),
  GOOGLE_SHEETS_USERS_TAB: z.string().trim().min(1).default("usuarios"),
  GOOGLE_SHEETS_STUDENTS_TAB: z.string().trim().min(1).default("alunos"),
  GOOGLE_SHEETS_CLASSES_TAB: z.string().trim().min(1).default("turmas"),
  GOOGLE_SHEETS_EXAMS_TAB: z.string().trim().min(1).default("provas"),
  GOOGLE_SHEETS_ANSWER_KEYS_TAB: z.string().trim().min(1).default("gabaritos"),
  GOOGLE_SHEETS_CORRECTION_RULES_TAB: z.string().trim().min(1).default("regras_correcao"),
  GOOGLE_SHEETS_CORRECTIONS_TAB: z.string().trim().min(1).default("correcoes"),
  GOOGLE_SHEETS_CONFIG_TAB: z.string().trim().min(1).default("provascan_config"),
});

type GoogleSheetsEnv = z.infer<typeof envSchema>;

type SheetsStatus = {
  configured: boolean;
  mode: "mock" | "google-sheets";
  studentsTab: string;
  usersTab: string;
};

type StudentSheetRecord = {
  id: string;
  nome: string;
  turma: string;
  ra: string;
  status: string;
};

type ConfigRow = {
  key: string;
  value: string;
};

type SheetDefinition = {
  columns: string;
  headers: readonly string[];
  tabName: string;
};

type OperationalSchemaCache = {
  checkedAt: number;
  key: string;
  pending: Promise<void> | null;
};

const OPERATIONAL_SCHEMA_CACHE_TTL_MS = 5 * 60 * 1000;
let operationalSchemaCache: OperationalSchemaCache | null = null;

export class GoogleSheetsConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleSheetsConfigError";
  }
}

export class GoogleSheetsSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleSheetsSchemaError";
  }
}

export class GoogleSheetsConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleSheetsConnectionError";
  }
}

function readEnv(): GoogleSheetsEnv | null {
  const parsed = envSchema.safeParse({
    GOOGLE_SHEETS_CLIENT_EMAIL: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    GOOGLE_SHEETS_PRIVATE_KEY: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
    GOOGLE_SHEETS_SPREADSHEET_ID: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    GOOGLE_SHEETS_USERS_TAB: process.env.GOOGLE_SHEETS_USERS_TAB,
    GOOGLE_SHEETS_STUDENTS_TAB: process.env.GOOGLE_SHEETS_STUDENTS_TAB,
    GOOGLE_SHEETS_CLASSES_TAB: process.env.GOOGLE_SHEETS_CLASSES_TAB,
    GOOGLE_SHEETS_EXAMS_TAB: process.env.GOOGLE_SHEETS_EXAMS_TAB,
    GOOGLE_SHEETS_ANSWER_KEYS_TAB: process.env.GOOGLE_SHEETS_ANSWER_KEYS_TAB,
    GOOGLE_SHEETS_CORRECTION_RULES_TAB: process.env.GOOGLE_SHEETS_CORRECTION_RULES_TAB,
    GOOGLE_SHEETS_CORRECTIONS_TAB: process.env.GOOGLE_SHEETS_CORRECTIONS_TAB,
    GOOGLE_SHEETS_CONFIG_TAB: process.env.GOOGLE_SHEETS_CONFIG_TAB,
  });

  return parsed.success ? parsed.data : null;
}

function unwrapEnvValue(value: string) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function requireEnv() {
  const env = readEnv();
  if (!env) {
    throw new GoogleSheetsConfigError("Credenciais do Google Sheets ausentes ou invalidas.");
  }

  return {
    ...env,
    GOOGLE_SHEETS_ANSWER_KEYS_TAB: unwrapEnvValue(env.GOOGLE_SHEETS_ANSWER_KEYS_TAB),
    GOOGLE_SHEETS_CLASSES_TAB: unwrapEnvValue(env.GOOGLE_SHEETS_CLASSES_TAB),
    GOOGLE_SHEETS_CLIENT_EMAIL: unwrapEnvValue(env.GOOGLE_SHEETS_CLIENT_EMAIL),
    GOOGLE_SHEETS_CONFIG_TAB: unwrapEnvValue(env.GOOGLE_SHEETS_CONFIG_TAB),
    GOOGLE_SHEETS_CORRECTIONS_TAB: unwrapEnvValue(env.GOOGLE_SHEETS_CORRECTIONS_TAB),
    GOOGLE_SHEETS_CORRECTION_RULES_TAB: unwrapEnvValue(env.GOOGLE_SHEETS_CORRECTION_RULES_TAB),
    GOOGLE_SHEETS_EXAMS_TAB: unwrapEnvValue(env.GOOGLE_SHEETS_EXAMS_TAB),
    GOOGLE_SHEETS_PRIVATE_KEY: unwrapEnvValue(env.GOOGLE_SHEETS_PRIVATE_KEY).replace(/\\n/g, "\n"),
    GOOGLE_SHEETS_SPREADSHEET_ID: unwrapEnvValue(env.GOOGLE_SHEETS_SPREADSHEET_ID),
    GOOGLE_SHEETS_STUDENTS_TAB: unwrapEnvValue(env.GOOGLE_SHEETS_STUDENTS_TAB),
    GOOGLE_SHEETS_USERS_TAB: unwrapEnvValue(env.GOOGLE_SHEETS_USERS_TAB),
  };
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

function normalizeCell(value: string | null | undefined) {
  return (value ?? "").trim();
}

function normalizeFlag(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();
}

function normalizeRange(tabName: string, columns: string) {
  return `${tabName}!${columns}`;
}

function slugify(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseInteger(value: string, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string) {
  return normalizeFlag(value) === "SIM" || normalizeFlag(value) === "TRUE";
}

function safeJsonParse<T>(value: string, fallback: T): T {
  if (!value.trim()) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function safeJsonStringify(value: unknown) {
  return JSON.stringify(value ?? null);
}

function splitAlternatives(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildClassId(turma: string) {
  const slug = slugify(turma);
  return `TURMA-${slug || "sem-nome"}`;
}

function normalizeTeacherProfile(configRows: ConfigRow[]) {
  const defaults = cloneDefaultAppData().teacherProfile;
  const map = new Map(configRows.map((row) => [row.key, row.value]));

  return {
    nome: map.get(CONFIG_KEYS.teacherName) || teacherProfile.nome || defaults.nome,
    email: map.get(CONFIG_KEYS.teacherEmail) || teacherProfile.email || defaults.email,
    escola: map.get(CONFIG_KEYS.teacherSchool) || teacherProfile.escola || defaults.escola,
  } satisfies TeacherProfile;
}

function buildOperationalSheetDefinitions(env: GoogleSheetsEnv): SheetDefinition[] {
  return [
    {
      columns: STUDENTS_RANGE_COLUMNS,
      headers: ["id", "nome", "turma", "ra", "status"],
      tabName: env.GOOGLE_SHEETS_STUDENTS_TAB,
    },
    {
      columns: CLASSES_RANGE_COLUMNS,
      headers: REQUIRED_CLASS_HEADERS,
      tabName: env.GOOGLE_SHEETS_CLASSES_TAB,
    },
    {
      columns: EXAMS_RANGE_COLUMNS,
      headers: REQUIRED_EXAM_HEADERS,
      tabName: env.GOOGLE_SHEETS_EXAMS_TAB,
    },
    {
      columns: ANSWER_KEYS_RANGE_COLUMNS,
      headers: REQUIRED_ANSWER_KEY_HEADERS,
      tabName: env.GOOGLE_SHEETS_ANSWER_KEYS_TAB,
    },
    {
      columns: CORRECTION_RULES_RANGE_COLUMNS,
      headers: REQUIRED_CORRECTION_RULE_HEADERS,
      tabName: env.GOOGLE_SHEETS_CORRECTION_RULES_TAB,
    },
    {
      columns: CORRECTIONS_RANGE_COLUMNS,
      headers: REQUIRED_CORRECTION_HEADERS,
      tabName: env.GOOGLE_SHEETS_CORRECTIONS_TAB,
    },
    {
      columns: CONFIG_RANGE_COLUMNS,
      headers: REQUIRED_CONFIG_HEADERS,
      tabName: env.GOOGLE_SHEETS_CONFIG_TAB,
    },
  ];
}

function mapCells(headers: string[], row: unknown[]) {
  const cells = new Map<string, string>();
  headers.forEach((header, index) => {
    cells.set(header, normalizeCell(String(row[index] ?? "")));
  });
  return cells;
}

function isUsableUserRecord(user: SheetsUserRecord) {
  return Boolean(user.id && user.nome && user.email && user.senha && user.perfil && user.ativo);
}

async function createSheetsApiClient() {
  const env = requireEnv();

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: env.GOOGLE_SHEETS_PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return {
    env,
    sheets: google.sheets({
      version: "v4",
      auth,
    }),
  };
}

async function listSheetTitles(sheets: sheets_v4.Sheets, spreadsheetId: string) {
  try {
    const metadata = await sheets.spreadsheets.get({ spreadsheetId });
    return new Set(
      (metadata.data.sheets ?? [])
        .map((sheet) => sheet.properties?.title)
        .filter((title): title is string => Boolean(title)),
    );
  } catch {
    throw new GoogleSheetsConnectionError("Erro ao conectar com a planilha.");
  }
}

async function ensureSheetHeaders(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  definition: SheetDefinition,
  options?: {
    allowLegacyStudentHeader?: boolean;
  },
) {
  try {
    const headerResult = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${definition.tabName}!1:1`,
    });

    const rawHeader = (headerResult.data.values?.[0] ?? []).map((cell) => normalizeHeader(String(cell)));
    if (!rawHeader.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${definition.tabName}!A1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [definition.headers.map((header) => String(header))],
        },
      });
      return;
    }

    if (definition.tabName === requireEnv().GOOGLE_SHEETS_STUDENTS_TAB && options?.allowLegacyStudentHeader) {
      const missingBase = REQUIRED_STUDENT_BASE_HEADERS.filter((header) => !rawHeader.includes(header));
      const hasStatus = rawHeader.includes("status") || rawHeader.includes("ativo");

      if (!missingBase.length && hasStatus) {
        if (!rawHeader.includes("status")) {
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${definition.tabName}!A1`,
            valueInputOption: "RAW",
            requestBody: {
              values: [["id", "nome", "turma", "ra", "status"]],
            },
          });
        }
        return;
      }
    }

    const missingHeaders = definition.headers.filter((header) => !rawHeader.includes(String(header)));
    if (missingHeaders.length > 0) {
      const canAppendMissingHeaders =
        rawHeader.length <= definition.headers.length &&
        rawHeader.every((header, index) => header === normalizeHeader(String(definition.headers[index])));

      if (canAppendMissingHeaders) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${definition.tabName}!A1`,
          valueInputOption: "RAW",
          requestBody: {
            values: [definition.headers.map((header) => String(header))],
          },
        });
        return;
      }

      throw new GoogleSheetsSchemaError(
        `A aba ${definition.tabName} esta sem as colunas obrigatorias: ${missingHeaders.join(", ")}.`,
      );
    }
  } catch (error) {
    if (error instanceof GoogleSheetsSchemaError) {
      throw error;
    }
    throw new GoogleSheetsConnectionError("Erro ao conectar com a planilha.");
  }
}

async function ensureOperationalSheetSchemas(env: GoogleSheetsEnv, sheets: sheets_v4.Sheets) {
  const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const definitions = buildOperationalSheetDefinitions(env);
  const existingTitles = await listSheetTitles(sheets, spreadsheetId);
  const missingDefinitions = definitions.filter((definition) => !existingTitles.has(definition.tabName));

  if (missingDefinitions.length > 0) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: missingDefinitions.map((definition) => ({
            addSheet: {
              properties: {
                title: definition.tabName,
              },
            },
          })),
        },
      });
    } catch {
      throw new GoogleSheetsConnectionError("Erro ao conectar com a planilha.");
    }
  }

  for (const definition of definitions) {
    await ensureSheetHeaders(sheets, spreadsheetId, definition, {
      allowLegacyStudentHeader: definition.tabName === env.GOOGLE_SHEETS_STUDENTS_TAB,
    });
  }
}

async function ensureOperationalSheetSchemasCached(
  env: GoogleSheetsEnv,
  sheets: sheets_v4.Sheets,
  options?: {
    force?: boolean;
  },
) {
  const cacheKey = [
    env.GOOGLE_SHEETS_SPREADSHEET_ID,
    env.GOOGLE_SHEETS_STUDENTS_TAB,
    env.GOOGLE_SHEETS_CLASSES_TAB,
    env.GOOGLE_SHEETS_EXAMS_TAB,
    env.GOOGLE_SHEETS_ANSWER_KEYS_TAB,
    env.GOOGLE_SHEETS_CORRECTION_RULES_TAB,
    env.GOOGLE_SHEETS_CORRECTIONS_TAB,
    env.GOOGLE_SHEETS_CONFIG_TAB,
  ].join("|");
  const now = Date.now();

  if (!options?.force && operationalSchemaCache?.key === cacheKey) {
    if (operationalSchemaCache.pending) {
      await operationalSchemaCache.pending;
      return;
    }

    if (now - operationalSchemaCache.checkedAt < OPERATIONAL_SCHEMA_CACHE_TTL_MS) {
      return;
    }
  }

  const pending = ensureOperationalSheetSchemas(env, sheets);
  operationalSchemaCache = {
    checkedAt: now,
    key: cacheKey,
    pending,
  };

  try {
    await pending;
    operationalSchemaCache = {
      checkedAt: Date.now(),
      key: cacheKey,
      pending: null,
    };
  } catch (error) {
    if (operationalSchemaCache?.key === cacheKey) {
      operationalSchemaCache = null;
    }
    throw error;
  }
}

async function readTabRows(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  definition: SheetDefinition,
) {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: normalizeRange(definition.tabName, definition.columns),
    });

    const rows = result.data.values ?? [];
    if (rows.length <= 1) {
      return [] as Map<string, string>[];
    }

    const headerRow = rows[0].map((cell) => normalizeHeader(String(cell)));
    return rows
      .slice(1)
      .filter((row) => row.some((cell) => normalizeCell(String(cell ?? ""))))
      .map((row) => mapCells(headerRow, row));
  } catch {
    throw new GoogleSheetsConnectionError("Erro ao conectar com a planilha.");
  }
}

async function writeTabRows(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  definition: SheetDefinition,
  rows: string[][],
) {
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: definition.tabName,
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${definition.tabName}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [definition.headers.map((header) => String(header)), ...rows],
      },
    });
  } catch {
    throw new GoogleSheetsConnectionError("Erro ao conectar com a planilha.");
  }
}

async function readUsersSheet() {
  const { env, sheets } = await createSheetsApiClient();

  let response: sheets_v4.Schema$ValueRange;
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID,
      range: normalizeRange(env.GOOGLE_SHEETS_USERS_TAB, USERS_RANGE_COLUMNS),
    });
    response = result.data;
  } catch {
    throw new GoogleSheetsConnectionError("Erro ao conectar com a planilha.");
  }

  const rows = response.values ?? [];
  if (rows.length === 0) {
    throw new GoogleSheetsSchemaError("A aba de usuarios esta vazia.");
  }

  const headerRow = rows[0].map((cell) => normalizeHeader(String(cell)));
  const missingHeaders = REQUIRED_USER_HEADERS.filter((header) => !headerRow.includes(header));

  if (missingHeaders.length > 0) {
    throw new GoogleSheetsSchemaError(
      `A aba de usuarios esta sem as colunas obrigatorias: ${missingHeaders.join(", ")}.`,
    );
  }

  const users = rows.slice(1).map((row, index) => {
    const cells = mapCells(headerRow, row);

    return {
      rowNumber: index + 2,
      record: {
        id: cells.get("id") ?? "",
        nome: cells.get("nome") ?? "",
        email: (cells.get("email") ?? "").toLowerCase(),
        senha: cells.get("senha") ?? "",
        perfil: cells.get("perfil") ?? "",
        disciplina: cells.get("disciplina") ?? cells.get("materia") ?? "",
        ativo: cells.get("ativo") ?? "",
        trocar_senha: cells.get("trocar_senha") ?? "",
      } satisfies SheetsUserRecord,
    };
  });

  return { env, sheets, users };
}

function mapStoredStudentStatus(value: string) {
  const normalized = normalizeFlag(value);
  if (normalized === "ATIVO" || normalized === "SIM") {
    return "Ativo" as const;
  }
  if (normalized === "TRANSFERIDO") {
    return "Transferido" as const;
  }
  return "Inativo" as const;
}

function buildLegacyClassesFromStudents(rows: StudentSheetRecord[], teacherName: string) {
  const currentYear = new Date().getFullYear().toString();
  const classesByName = new Map<string, ClassRoom>();

  rows.forEach((row) => {
    if (!row.turma || classesByName.has(row.turma)) {
      return;
    }

    classesByName.set(row.turma, {
      id: buildClassId(row.turma),
      nome: row.turma,
      professor: teacherName,
      ano: currentYear,
      periodo: "Nao informado",
    });
  });

  return normalizeClasses(
    [...classesByName.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
  );
}

function mapStudentRowsToDomain(rows: StudentSheetRecord[], storedClasses: ClassRoom[]) {
  const classIdByName = new Map(storedClasses.map((item) => [item.nome, item.id]));
  const classIds = new Set(storedClasses.map((item) => item.id));
  const usingLegacyTurmaNames = storedClasses.length === 0;

  return rows.map((row) => {
    const turmaId = classIds.has(row.turma) ? row.turma : (classIdByName.get(row.turma) ?? row.turma);
    const studentId =
      usingLegacyTurmaNames && row.id && !row.id.startsWith("ALUNO-") ? `ALUNO-${row.id}` : row.id;

    return {
      id: studentId || `ALUNO-${slugify(`${row.nome}-${row.ra || row.turma}`)}`,
      matricula: row.ra || row.id,
      nome: row.nome,
      status: mapStoredStudentStatus(row.status),
      turma: turmaId,
    } satisfies Student;
  });
}

async function readStudentsRecords(env: GoogleSheetsEnv, sheets: sheets_v4.Sheets) {
  const rows = await readTabRows(sheets, env.GOOGLE_SHEETS_SPREADSHEET_ID, {
    columns: STUDENTS_RANGE_COLUMNS,
    headers: ["id", "nome", "turma", "ra", "status"],
    tabName: env.GOOGLE_SHEETS_STUDENTS_TAB,
  });

  return rows.map((cells) => ({
    id: cells.get("id") ?? "",
    nome: cells.get("nome") ?? "",
    turma: cells.get("turma") ?? "",
    ra: cells.get("ra") ?? "",
    status: cells.get("status") ?? cells.get("ativo") ?? "",
  })) satisfies StudentSheetRecord[];
}

async function readClasses(env: GoogleSheetsEnv, sheets: sheets_v4.Sheets) {
  const rows = await readTabRows(sheets, env.GOOGLE_SHEETS_SPREADSHEET_ID, {
    columns: CLASSES_RANGE_COLUMNS,
    headers: REQUIRED_CLASS_HEADERS,
    tabName: env.GOOGLE_SHEETS_CLASSES_TAB,
  });

  return rows.map((cells) => ({
    id: cells.get("id") ?? "",
    nome: cells.get("nome") ?? "",
    professor: cells.get("professor") ?? "",
    ano: cells.get("ano") ?? "",
    periodo: cells.get("periodo") ?? "",
    audienceId: cells.get("audience_id") || undefined,
    audienceLabel: cells.get("audience_label") || undefined,
    groupType: (cells.get("group_type") || undefined) as ClassRoom["groupType"],
    requiresManualGrouping: parseBoolean(cells.get("requires_manual_grouping") ?? ""),
    yearSegment: (cells.get("year_segment") || undefined) as ClassRoom["yearSegment"],
  })) satisfies ClassRoom[];
}

async function readExams(env: GoogleSheetsEnv, sheets: sheets_v4.Sheets) {
  const rows = await readTabRows(sheets, env.GOOGLE_SHEETS_SPREADSHEET_ID, {
    columns: EXAMS_RANGE_COLUMNS,
    headers: REQUIRED_EXAM_HEADERS,
    tabName: env.GOOGLE_SHEETS_EXAMS_TAB,
  });

  return rows.map((cells) => ({
    id: cells.get("id") ?? "",
    titulo: cells.get("titulo") ?? "",
    subject: cells.get("disciplina") ?? "",
    audienceId: cells.get("audience_id") ?? "",
    audienceLabel: cells.get("audience_label") ?? "",
    groupType: (cells.get("group_type") ?? "INDEFINIDO") as Exam["groupType"],
    yearSegment: (cells.get("year_segment") ?? "OUTROS") as Exam["yearSegment"],
    quantidadeQuestoes: parseInteger(cells.get("quantidade_questoes") ?? "", 0),
    alternativas: splitAlternatives(cells.get("alternativas") ?? ""),
    data: cells.get("data") ?? "",
    codigo: cells.get("codigo") ?? "",
    templateVersion: cells.get("template_version") ?? "PS-CARD-1",
  })) satisfies Exam[];
}

async function readAnswerKeys(env: GoogleSheetsEnv, sheets: sheets_v4.Sheets) {
  const rows = await readTabRows(sheets, env.GOOGLE_SHEETS_SPREADSHEET_ID, {
    columns: ANSWER_KEYS_RANGE_COLUMNS,
    headers: REQUIRED_ANSWER_KEY_HEADERS,
    tabName: env.GOOGLE_SHEETS_ANSWER_KEYS_TAB,
  });

  return rows.map((cells) => ({
    provaId: cells.get("prova_id") ?? "",
    questao: parseInteger(cells.get("questao") ?? "", 0),
    respostaCorreta: cells.get("resposta_correta") ?? "",
  }));
}

async function readCorrectionRules(env: GoogleSheetsEnv, sheets: sheets_v4.Sheets) {
  const rows = await readTabRows(sheets, env.GOOGLE_SHEETS_SPREADSHEET_ID, {
    columns: CORRECTION_RULES_RANGE_COLUMNS,
    headers: REQUIRED_CORRECTION_RULE_HEADERS,
    tabName: env.GOOGLE_SHEETS_CORRECTION_RULES_TAB,
  });

  return rows.map((cells) => ({
    provaId: cells.get("prova_id") ?? "",
    notaMaxima: parseNumber(cells.get("nota_maxima") ?? "", 10),
    arredondamentoCasas: parseInteger(cells.get("arredondamento_casas") ?? "", 1),
    pesoPadrao: parseNumber(cells.get("peso_padrao") ?? "", 1),
    pesosPorQuestao: safeJsonParse(cells.get("pesos_por_questao") ?? "", [] as ExamCorrectionRule["pesosPorQuestao"]),
    questoesAnuladas: safeJsonParse(cells.get("questoes_anuladas") ?? "", [] as number[]),
    modoQuestaoAnulada: (cells.get("modo_questao_anulada") ?? "full-credit") as ExamCorrectionRule["modoQuestaoAnulada"],
  })) satisfies ExamCorrectionRule[];
}

async function readCorrections(env: GoogleSheetsEnv, sheets: sheets_v4.Sheets) {
  const rows = await readTabRows(sheets, env.GOOGLE_SHEETS_SPREADSHEET_ID, {
    columns: CORRECTIONS_RANGE_COLUMNS,
    headers: REQUIRED_CORRECTION_HEADERS,
    tabName: env.GOOGLE_SHEETS_CORRECTIONS_TAB,
  });

  return rows.map((cells) => ({
    correction: {
      id: cells.get("id") ?? "",
      provaId: cells.get("prova_id") ?? "",
      alunoId: cells.get("aluno_id") ?? "",
      nomeDetectado: cells.get("nome_detectado") ?? "",
      nota: parseNumber(cells.get("nota") ?? "", 0),
      acertos: parseInteger(cells.get("acertos") ?? "", 0),
      erros: parseInteger(cells.get("erros") ?? "", 0),
      emBranco: parseInteger(cells.get("em_branco") ?? "", 0),
      multiplasMarcacoes: parseInteger(cells.get("multiplas_marcacoes") ?? "", 0),
      anuladas: parseInteger(cells.get("anuladas") ?? "", 0),
      percentual: parseNumber(cells.get("percentual") ?? "", 0),
      data: cells.get("data") ?? "",
      imagem: cells.get("imagem") ?? "",
      tempoCorrecao: cells.get("tempo_correcao") ?? "",
      metodoIdentificacao: (cells.get("metodo_identificacao") ?? "manual") as CorrectionSession["correction"]["metodoIdentificacao"],
    },
    aluno: safeJsonParse(cells.get("aluno_json") ?? "", cloneDefaultAppData().students[0] ?? ({} as Student)),
    prova: safeJsonParse(cells.get("prova_json") ?? "", cloneDefaultAppData().exams[0] ?? ({} as Exam)),
    turma: safeJsonParse(cells.get("turma_json") ?? "", cloneDefaultAppData().classes[0] ?? ({} as ClassRoom)),
    respostas: safeJsonParse(cells.get("respostas_json") ?? "", [] as CorrectionSession["respostas"]),
    confiancaOcr: parseNumber(cells.get("confianca_ocr") ?? "", 0),
    imagemProcessada: cells.get("imagem_processada") ?? "",
    observacoes: safeJsonParse(cells.get("observacoes_json") ?? "", [] as string[]),
    identificacao: safeJsonParse(cells.get("identificacao_json") ?? "", {
      method: "manual",
      qrCode: "",
      uniqueCode: "",
    } as CorrectionSession["identificacao"]),
  })) satisfies CorrectionSession[];
}

async function readConfigRows(env: GoogleSheetsEnv, sheets: sheets_v4.Sheets) {
  const rows = await readTabRows(sheets, env.GOOGLE_SHEETS_SPREADSHEET_ID, {
    columns: CONFIG_RANGE_COLUMNS,
    headers: REQUIRED_CONFIG_HEADERS,
    tabName: env.GOOGLE_SHEETS_CONFIG_TAB,
  });

  return rows.map((cells) => ({
    key: cells.get("key") ?? "",
    value: cells.get("value") ?? "",
  })) satisfies ConfigRow[];
}

function buildConfigRows(profile: TeacherProfile) {
  return [
    [CONFIG_KEYS.teacherName, profile.nome],
    [CONFIG_KEYS.teacherEmail, profile.email],
    [CONFIG_KEYS.teacherSchool, profile.escola],
  ];
}

export function getSheetsStatus(): SheetsStatus {
  const env = readEnv();
  if (!env) {
    return {
      configured: false,
      mode: "mock",
      studentsTab: process.env.GOOGLE_SHEETS_STUDENTS_TAB?.trim() || "alunos",
      usersTab: process.env.GOOGLE_SHEETS_USERS_TAB?.trim() || "usuarios",
    };
  }

  return {
    configured: true,
    mode: "google-sheets",
    studentsTab: env.GOOGLE_SHEETS_STUDENTS_TAB,
    usersTab: env.GOOGLE_SHEETS_USERS_TAB,
  };
}

export function isActiveUser(value: string) {
  return normalizeFlag(value) === "SIM";
}

export function shouldForcePasswordChange(value: string) {
  return normalizeFlag(value) === "SIM";
}

export async function getUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const { users } = await readUsersSheet();
  const match = users.find((item) => item.record.email === normalizedEmail);

  if (!match) {
    return null;
  }

  if (!isUsableUserRecord(match.record)) {
    throw new GoogleSheetsSchemaError(`A linha do usuario ${normalizedEmail} esta incompleta.`);
  }

  return match.record;
}

async function findUserRowById(userId: string) {
  const { env, sheets, users } = await readUsersSheet();
  const match = users.find((item) => item.record.id === userId);

  if (!match) {
    return null;
  }

  return { env, sheets, match };
}

export async function updateUserPassword(
  userId: string,
  nextStoredPassword: string,
  options?: {
    clearPasswordChangeFlag?: boolean;
  },
) {
  const found = await findUserRowById(userId);
  if (!found) {
    throw new GoogleSheetsSchemaError("Usuario nao encontrado para atualizar senha.");
  }

  try {
    const data: sheets_v4.Schema$ValueRange[] = [
      {
        range: `${found.env.GOOGLE_SHEETS_USERS_TAB}!D${found.match.rowNumber}`,
        values: [[nextStoredPassword]],
      },
    ];

    if (options?.clearPasswordChangeFlag) {
      data.push({
        range: `${found.env.GOOGLE_SHEETS_USERS_TAB}!G${found.match.rowNumber}`,
        values: [["NAO"]],
      });
    }

    await found.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: found.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      requestBody: {
        data,
        valueInputOption: "USER_ENTERED",
      },
    });
  } catch {
    throw new GoogleSheetsConnectionError("Erro ao conectar com a planilha.");
  }
}

export async function updateUserPasswordChangeFlag(userId: string, shouldForce: boolean) {
  const found = await findUserRowById(userId);
  if (!found) {
    throw new GoogleSheetsSchemaError("Usuario nao encontrado para atualizar status de troca de senha.");
  }

  try {
    await found.sheets.spreadsheets.values.update({
      spreadsheetId: found.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      range: `${found.env.GOOGLE_SHEETS_USERS_TAB}!G${found.match.rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[shouldForce ? "SIM" : "NAO"]],
      },
    });
  } catch {
    throw new GoogleSheetsConnectionError("Erro ao conectar com a planilha.");
  }
}

export async function updateAllUsersPasswordChangeFlag(shouldForce: boolean) {
  const { env, sheets, users } = await readUsersSheet();
  const rows = users.filter((item) => item.record.id && item.record.nome);

  if (!rows.length) {
    return { updated: 0 };
  }

  try {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID,
      requestBody: {
        data: rows.map((item) => ({
          range: `${env.GOOGLE_SHEETS_USERS_TAB}!G${item.rowNumber}`,
          values: [[shouldForce ? "SIM" : "NAO"]],
        })),
        valueInputOption: "USER_ENTERED",
      },
    });
  } catch {
    throw new GoogleSheetsConnectionError("Erro ao conectar com a planilha.");
  }

  return { updated: rows.length };
}

export async function listUsersForAdmin() {
  const { users } = await readUsersSheet();

  return users
    .filter((item) => item.record.id && item.record.nome)
    .map((item) => ({
      id: item.record.id,
      nome: item.record.nome,
      email: item.record.email,
      perfil: item.record.perfil,
      disciplina: item.record.disciplina ?? "",
      ativo: item.record.ativo,
      trocar_senha: item.record.trocar_senha,
    }));
}

export async function getUsersSheetHealth() {
  const { users } = await readUsersSheet();
  return {
    status: getSheetsStatus(),
    usersCount: users.length,
  };
}

export async function getOperationalAppData() {
  const { env, sheets } = await createSheetsApiClient();
  await ensureOperationalSheetSchemasCached(env, sheets);

  const [storedClasses, studentRows, examsRows, answerKeyRows, correctionRuleRows, correctionRows, configRows] =
    await Promise.all([
      readClasses(env, sheets),
      readStudentsRecords(env, sheets),
      readExams(env, sheets),
      readAnswerKeys(env, sheets),
      readCorrectionRules(env, sheets),
      readCorrections(env, sheets),
      readConfigRows(env, sheets),
    ]);

  const nextTeacherProfile = normalizeTeacherProfile(configRows);
  const derivedClasses =
    storedClasses.length > 0 ? normalizeClasses(storedClasses) : buildLegacyClassesFromStudents(studentRows, nextTeacherProfile.nome);
  const mappedStudents = mapStudentRowsToDomain(studentRows, derivedClasses);

  return {
    answerKeys: answerKeyRows,
    classes: derivedClasses,
    correctionRules: correctionRuleRows,
    corrections: correctionRows,
    exams: examsRows,
    students: mappedStudents,
    teacherProfile: nextTeacherProfile,
  } satisfies AppDataState;
}

export async function saveOperationalAppData(data: AppDataState) {
  const { env, sheets } = await createSheetsApiClient();
  await ensureOperationalSheetSchemasCached(env, sheets, { force: true });

  const definitions = buildOperationalSheetDefinitions(env);
  const findDefinition = (tabName: string) => {
    const match = definitions.find((definition) => definition.tabName === tabName);
    if (!match) {
      throw new GoogleSheetsSchemaError(`Configuracao ausente para a aba ${tabName}.`);
    }
    return match;
  };

  const normalizedData = {
    ...data,
    classes: normalizeClasses(data.classes),
  };

  await writeTabRows(
    sheets,
    env.GOOGLE_SHEETS_SPREADSHEET_ID,
    findDefinition(env.GOOGLE_SHEETS_STUDENTS_TAB),
    normalizedData.students.map((item) => [item.id, item.nome, item.turma, item.matricula, item.status]),
  );
  await writeTabRows(
    sheets,
    env.GOOGLE_SHEETS_SPREADSHEET_ID,
    findDefinition(env.GOOGLE_SHEETS_CLASSES_TAB),
    normalizedData.classes.map((item) => [
      item.id,
      item.nome,
      item.professor,
      item.ano,
      item.periodo,
      item.audienceId ?? "",
      item.audienceLabel ?? "",
      item.groupType ?? "",
      item.yearSegment ?? "",
    ]),
  );
  await writeTabRows(
    sheets,
    env.GOOGLE_SHEETS_SPREADSHEET_ID,
    findDefinition(env.GOOGLE_SHEETS_EXAMS_TAB),
    normalizedData.exams.map((item) => [
      item.id,
      item.titulo,
      item.subject,
      item.audienceId,
      item.audienceLabel,
      item.groupType,
      item.yearSegment,
      String(item.quantidadeQuestoes),
      item.alternativas.join(","),
      item.data,
      item.codigo,
      item.templateVersion,
    ]),
  );
  await writeTabRows(
    sheets,
    env.GOOGLE_SHEETS_SPREADSHEET_ID,
    findDefinition(env.GOOGLE_SHEETS_ANSWER_KEYS_TAB),
    normalizedData.answerKeys.map((item) => [item.provaId, String(item.questao), item.respostaCorreta]),
  );
  await writeTabRows(
    sheets,
    env.GOOGLE_SHEETS_SPREADSHEET_ID,
    findDefinition(env.GOOGLE_SHEETS_CORRECTION_RULES_TAB),
    normalizedData.correctionRules.map((item) => [
      item.provaId,
      String(item.notaMaxima),
      String(item.arredondamentoCasas),
      String(item.pesoPadrao),
      safeJsonStringify(item.pesosPorQuestao),
      safeJsonStringify(item.questoesAnuladas),
      item.modoQuestaoAnulada,
    ]),
  );
  await writeTabRows(
    sheets,
    env.GOOGLE_SHEETS_SPREADSHEET_ID,
    findDefinition(env.GOOGLE_SHEETS_CORRECTIONS_TAB),
    normalizedData.corrections.map((item) => [
      item.correction.id,
      item.correction.provaId,
      item.correction.alunoId,
      item.correction.nomeDetectado,
      String(item.correction.nota),
      String(item.correction.acertos),
      String(item.correction.erros),
      String(item.correction.emBranco),
      String(item.correction.multiplasMarcacoes),
      String(item.correction.anuladas),
      String(item.correction.percentual),
      item.correction.data,
      item.correction.imagem,
      item.correction.tempoCorrecao,
      item.correction.metodoIdentificacao,
      safeJsonStringify(item.aluno),
      safeJsonStringify(item.prova),
      safeJsonStringify(item.turma),
      safeJsonStringify(item.respostas),
      String(item.confiancaOcr),
      item.imagemProcessada,
      safeJsonStringify(item.observacoes),
      safeJsonStringify(item.identificacao),
    ]),
  );
  await writeTabRows(
    sheets,
    env.GOOGLE_SHEETS_SPREADSHEET_ID,
    findDefinition(env.GOOGLE_SHEETS_CONFIG_TAB),
    buildConfigRows(normalizedData.teacherProfile),
  );
}

export async function getSchoolRoster() {
  const data = await getOperationalAppData();
  return {
    classes: data.classes,
    students: data.students,
  };
}

export async function getSystemSnapshot() {
  const status = getSheetsStatus();

  if (!status.configured) {
    return {
      status,
      totals: {
        alunos: students.length,
        turmas: classes.length,
        provas: exams.length,
        correcoes: correctionSessions.length,
        usuarios: 0,
      },
    };
  }

  const [health, data] = await Promise.all([getUsersSheetHealth(), getOperationalAppData()]);

  return {
    status: health.status,
    totals: {
      alunos: data.students.length,
      turmas: data.classes.length,
      provas: data.exams.length,
      correcoes: data.corrections.length,
      usuarios: health.usersCount,
    },
  };
}
