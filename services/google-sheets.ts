import { z } from "zod";
import { classes, correctionSessions, exams, students } from "@/lib/mock-data";

const envSchema = z.object({
  GOOGLE_SHEETS_CLIENT_EMAIL: z.string().min(1).optional(),
  GOOGLE_SHEETS_PRIVATE_KEY: z.string().min(1).optional(),
  GOOGLE_SHEETS_SPREADSHEET_ID: z.string().min(1).optional(),
});

export type SheetsStatus = {
  configured: boolean;
  mode: "mock" | "google-sheets";
};

export type SheetsUser = {
  id: string;
  nome: string;
  email: string;
  senha: string;
  perfil: string;
  ativo: string;
  trocar_senha: string;
};

function parseEnv() {
  return envSchema.parse({
    GOOGLE_SHEETS_CLIENT_EMAIL: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    GOOGLE_SHEETS_PRIVATE_KEY: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
    GOOGLE_SHEETS_SPREADSHEET_ID: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  });
}

export function getSheetsStatus(): SheetsStatus {
  const parsed = parseEnv();

  if (
    parsed.GOOGLE_SHEETS_CLIENT_EMAIL &&
    parsed.GOOGLE_SHEETS_PRIVATE_KEY &&
    parsed.GOOGLE_SHEETS_SPREADSHEET_ID
  ) {
    return {
      configured: true,
      mode: "google-sheets",
    };
  }

  return { configured: false, mode: "mock" };
}

// --- JWT assertion for service account ---

function encodeBase64Url(value: string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return `${normalized}${padding}`;
}

async function getAccessToken(): Promise<string | null> {
  const env = parseEnv();
  if (!env.GOOGLE_SHEETS_CLIENT_EMAIL || !env.GOOGLE_SHEETS_PRIVATE_KEY) {
    return null;
  }

  const privateKeyRaw = env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/^"|"$/g, "").replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = { alg: "RS256", typ: "JWT" };
  const jwtPayload = {
    iss: env.GOOGLE_SHEETS_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = encodeBase64Url(JSON.stringify(jwtHeader));
  const payloadB64 = encodeBase64Url(JSON.stringify(jwtPayload));
  const signatureInput = `${headerB64}.${payloadB64}`;

  // Import the private key
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKeyRaw
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");
  const binaryKey = Buffer.from(pemContents, "base64");

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(signatureInput),
  );

  const signatureB64 = encodeBase64Url(
    Buffer.from(new Uint8Array(signature)).toString("base64"),
  );

  const assertion = `${signatureInput}.${signatureB64}`;

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to get access token:", errorText);
      return null;
    }

    const data = (await response.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch (error) {
    console.error("Failed to get access token:", error);
    return null;
  }
}

// --- Sheets API calls ---

async function fetchSheetData(range: string): Promise<string[][] | null> {
  const env = parseEnv();
  if (!env.GOOGLE_SHEETS_SPREADSHEET_ID) {
    return null;
  }

  const token = await getAccessToken();
  if (!token) {
    return null;
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEETS_SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Failed to fetch sheet data:", await response.text());
      return null;
    }

    const data = (await response.json()) as { values?: string[][] };
    return data.values ?? null;
  } catch (error) {
    console.error("Failed to fetch sheet data:", error);
    return null;
  }
}

/**
 * Fetches users from the "usuarios" sheet.
 * Expects columns: id, nome, email, senha, perfil, ativo, trocar_senha
 */
export async function fetchUsers(): Promise<SheetsUser[]> {
  const raw = await fetchSheetData("usuarios!A:G");

  if (!raw || raw.length < 2) {
    return [];
  }

  // Skip header row
  return raw.slice(1).map((row) => ({
    id: row[0] ?? "",
    nome: row[1] ?? "",
    email: (row[2] ?? "").trim().toLowerCase(),
    senha: row[3] ?? "",
    perfil: row[4] ?? "",
    ativo: (row[5] ?? "").trim().toLowerCase(),
    trocar_senha: (row[6] ?? "").trim().toLowerCase(),
  }));
}

/**
 * Validates credentials against the Google Sheets "usuarios" sheet.
 */
export async function validateCredentials(
  email: string,
  password: string,
): Promise<SheetsUser | null> {
  const users = await fetchUsers();

  const normalizedEmail = email.trim().toLowerCase();

  const user = users.find(
    (u) => u.email === normalizedEmail && u.senha === password && u.ativo === "sim",
  );

  return user ?? null;
}

export async function createSheetsClient() {
  const status = getSheetsStatus();
  if (status.mode === "mock") {
    return null;
  }

  return {
    baseUrl: `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEETS_SPREADSHEET_ID}`,
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