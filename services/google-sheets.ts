import { z } from "zod";
import { classes, correctionSessions, exams, students } from "@/lib/mock-data";

const envSchema = z.object({
  GOOGLE_SHEETS_CLIENT_EMAIL: z.string().min(1).optional(),
  GOOGLE_SHEETS_PRIVATE_KEY: z.string().min(1).optional(),
  GOOGLE_SHEETS_SPREADSHEET_ID: z.string().min(1).optional(),
});

export type SheetsStatus = {
  mode: "mock" | "google-sheets";
  spreadsheetId?: string;
};

export function getSheetsStatus(): SheetsStatus {
  const parsed = envSchema.parse({
    GOOGLE_SHEETS_CLIENT_EMAIL: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    GOOGLE_SHEETS_PRIVATE_KEY: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
    GOOGLE_SHEETS_SPREADSHEET_ID: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  });

  if (
    parsed.GOOGLE_SHEETS_CLIENT_EMAIL &&
    parsed.GOOGLE_SHEETS_PRIVATE_KEY &&
    parsed.GOOGLE_SHEETS_SPREADSHEET_ID
  ) {
    return {
      mode: "google-sheets",
      spreadsheetId: parsed.GOOGLE_SHEETS_SPREADSHEET_ID,
    };
  }

  return { mode: "mock" };
}

export async function createSheetsClient() {
  const status = getSheetsStatus();
  if (status.mode === "mock") {
    return null;
  }

  return {
    spreadsheetId: status.spreadsheetId,
    baseUrl: `https://sheets.googleapis.com/v4/spreadsheets/${status.spreadsheetId}`,
  };
}

export async function getSystemSnapshot() {
  return {
    status: getSheetsStatus(),
    totals: {
      alunos: students.length,
      turmas: classes.length,
      provas: exams.length,
      correcoes: correctionSessions.length,
    },
  };
}
