import { google, sheets_v4 } from "googleapis";
import { z } from "zod";
import { classes, correctionSessions, exams, students } from "@/lib/mock-data";
import type { ClassRoom, Student } from "@/types/domain";
import type { SheetsUserRecord } from "@/types/auth";

const USERS_RANGE_COLUMNS = "A:G";
const STUDENTS_RANGE_COLUMNS = "A:E";
const REQUIRED_HEADERS = ["id", "nome", "email", "senha", "perfil", "ativo", "trocar_senha"] as const;
const REQUIRED_STUDENT_HEADERS = ["id", "nome", "turma", "ra", "ativo"] as const;

const envSchema = z.object({
  GOOGLE_SHEETS_CLIENT_EMAIL: z.string().email(),
  GOOGLE_SHEETS_PRIVATE_KEY: z.string().min(1),
  GOOGLE_SHEETS_SPREADSHEET_ID: z.string().min(1),
  GOOGLE_SHEETS_USERS_TAB: z.string().trim().min(1).default("usuarios"),
  GOOGLE_SHEETS_STUDENTS_TAB: z.string().trim().min(1).default("alunos"),
});

type GoogleSheetsEnv = z.infer<typeof envSchema>;

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

export type SheetsStatus = {
  configured: boolean;
  mode: "mock" | "google-sheets";
  studentsTab: string;
  usersTab: string;
};

type SheetsStudentRecord = {
  id: string;
  nome: string;
  turma: string;
  ra: string;
  ativo: string;
};

function readEnv(): GoogleSheetsEnv | null {
  const parsed = envSchema.safeParse({
    GOOGLE_SHEETS_CLIENT_EMAIL: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    GOOGLE_SHEETS_PRIVATE_KEY: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
    GOOGLE_SHEETS_SPREADSHEET_ID: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    GOOGLE_SHEETS_USERS_TAB: process.env.GOOGLE_SHEETS_USERS_TAB,
    GOOGLE_SHEETS_STUDENTS_TAB: process.env.GOOGLE_SHEETS_STUDENTS_TAB,
  });

  return parsed.success ? parsed.data : null;
}

function requireEnv() {
  const env = readEnv();
  if (!env) {
    throw new GoogleSheetsConfigError("Credenciais do Google Sheets ausentes ou invalidas.");
  }

  return {
    ...env,
    GOOGLE_SHEETS_PRIVATE_KEY: env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n"),
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

function getUsersTabRange(usersTab: string) {
  return `${usersTab}!${USERS_RANGE_COLUMNS}`;
}

function getStudentsTabRange(studentsTab: string) {
  return `${studentsTab}!${STUDENTS_RANGE_COLUMNS}`;
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

function isUsableUserRecord(user: SheetsUserRecord) {
  return Boolean(user.id && user.nome && user.email && user.senha && user.perfil && user.ativo);
}

function mapStudentStatus(value: string) {
  return isActiveUser(value) ? "Ativo" : "Inativo";
}

function buildClassId(turma: string) {
  const slug = slugify(turma);
  return `TURMA-${slug || "sem-nome"}`;
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

async function readUsersSheet() {
  const { env, sheets } = await createSheetsApiClient();

  let response: sheets_v4.Schema$ValueRange;
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID,
      range: getUsersTabRange(env.GOOGLE_SHEETS_USERS_TAB),
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
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headerRow.includes(header));

  if (missingHeaders.length > 0) {
    throw new GoogleSheetsSchemaError(
      `A aba de usuarios esta sem as colunas obrigatorias: ${missingHeaders.join(", ")}.`,
    );
  }

  const users = rows.slice(1).map((row, index) => {
    const cells = new Map<string, string>();
    headerRow.forEach((header, columnIndex) => {
      cells.set(header, normalizeCell(String(row[columnIndex] ?? "")));
    });

    return {
      rowNumber: index + 2,
      record: {
        id: cells.get("id") ?? "",
        nome: cells.get("nome") ?? "",
        email: (cells.get("email") ?? "").toLowerCase(),
        senha: cells.get("senha") ?? "",
        perfil: cells.get("perfil") ?? "",
        ativo: cells.get("ativo") ?? "",
        trocar_senha: cells.get("trocar_senha") ?? "",
      } satisfies SheetsUserRecord,
    };
  });

  return { env, sheets, users };
}

async function readStudentsSheet() {
  const { env, sheets } = await createSheetsApiClient();

  let response: sheets_v4.Schema$ValueRange;
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID,
      range: getStudentsTabRange(env.GOOGLE_SHEETS_STUDENTS_TAB),
    });
    response = result.data;
  } catch {
    throw new GoogleSheetsConnectionError("Erro ao conectar com a planilha.");
  }

  const rows = response.values ?? [];
  if (rows.length === 0) {
    throw new GoogleSheetsSchemaError("A aba de alunos esta vazia.");
  }

  const headerRow = rows[0].map((cell) => normalizeHeader(String(cell)));
  const missingHeaders = REQUIRED_STUDENT_HEADERS.filter((header) => !headerRow.includes(header));

  if (missingHeaders.length > 0) {
    throw new GoogleSheetsSchemaError(
      `A aba de alunos esta sem as colunas obrigatorias: ${missingHeaders.join(", ")}.`,
    );
  }

  return rows.slice(1).map((row) => {
    const cells = new Map<string, string>();
    headerRow.forEach((header, columnIndex) => {
      cells.set(header, normalizeCell(String(row[columnIndex] ?? "")));
    });

    return {
      id: cells.get("id") ?? "",
      nome: cells.get("nome") ?? "",
      turma: cells.get("turma") ?? "",
      ra: cells.get("ra") ?? "",
      ativo: cells.get("ativo") ?? "",
    } satisfies SheetsStudentRecord;
  });
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

export async function updateUserPassword(userId: string, nextStoredPassword: string) {
  const found = await findUserRowById(userId);
  if (!found) {
    throw new GoogleSheetsSchemaError("Usuario nao encontrado para atualizar senha.");
  }

  try {
    await found.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: found.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      requestBody: {
        data: [
          {
            range: `${found.env.GOOGLE_SHEETS_USERS_TAB}!D${found.match.rowNumber}`,
            values: [[nextStoredPassword]],
          },
          {
            range: `${found.env.GOOGLE_SHEETS_USERS_TAB}!G${found.match.rowNumber}`,
            values: [["NAO"]],
          },
        ],
        valueInputOption: "USER_ENTERED",
      },
    });
  } catch {
    throw new GoogleSheetsConnectionError("Erro ao conectar com a planilha.");
  }
}

export async function getUsersSheetHealth() {
  const { users } = await readUsersSheet();
  return {
    status: getSheetsStatus(),
    usersCount: users.length,
  };
}

export async function getSchoolRoster() {
  const rows = await readStudentsSheet();
  const filteredRows = rows.filter((row) => row.nome && row.turma);
  const currentYear = new Date().getFullYear().toString();
  const teacherName = "Professor responsavel";

  const classesByName = new Map<string, ClassRoom>();
  filteredRows.forEach((row) => {
    if (classesByName.has(row.turma)) {
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

  const mappedClasses = [...classesByName.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const mappedStudents: Student[] = filteredRows.map((row) => ({
    id: row.id ? `ALUNO-${row.id}` : `ALUNO-${slugify(`${row.nome}-${row.ra || row.turma}`)}`,
    matricula: row.ra || row.id,
    nome: row.nome,
    status: mapStudentStatus(row.ativo),
    turma: classesByName.get(row.turma)?.id ?? buildClassId(row.turma),
  }));

  return {
    classes: mappedClasses,
    students: mappedStudents,
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

  const health = await getUsersSheetHealth();
  const roster = await getSchoolRoster();

  return {
    status: health.status,
    totals: {
      alunos: roster.students.length,
      turmas: roster.classes.length,
      provas: exams.length,
      correcoes: correctionSessions.length,
      usuarios: health.usersCount,
    },
  };
}
