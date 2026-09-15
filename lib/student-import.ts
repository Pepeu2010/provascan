import type { ClassRoom, Student, StudentStatus } from "@/types/domain";

export type StudentImportRow = { nome: string; status: StudentStatus; turma: string };
export type StudentImportResult = { duplicates: string[]; errors: string[]; rows: StudentImportRow[] };

const headerAliases = {
  nome: new Set(["aluno", "aluna", "estudante", "name", "nome", "nome do aluno"]),
  status: new Set(["situacao", "status"]),
  turma: new Set(["class", "classe", "sala", "turma"]),
};

export function parseStudentCsv(raw: string, classes: ClassRoom[], existing: Student[]): StudentImportResult {
  const clean = raw.replace(/^\uFEFF/, "").trim();
  if (!clean) return { duplicates: [], errors: ["O arquivo está vazio."], rows: [] };
  const lines = clean.split(/\r?\n/).filter((line) => line.trim());
  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map(normalize);
  const nameIndex = headers.findIndex((value) => headerAliases.nome.has(value));
  const classIndex = headers.findIndex((value) => headerAliases.turma.has(value));
  const statusIndex = headers.findIndex((value) => headerAliases.status.has(value));
  if (nameIndex < 0 || classIndex < 0) return { duplicates: [], errors: ["Use as colunas Nome/Aluno e Turma."], rows: [] };

  const classMap = new Map(classes.flatMap((item) => [[normalize(item.nome), item.id], [normalize(item.id), item.id]]));
  const seen = new Set(existing.map((item) => `${normalize(item.nome)}|${item.turma}`));
  const result: StudentImportResult = { duplicates: [], errors: [], rows: [] };
  lines.slice(1).forEach((line, index) => {
    const values = splitCsvLine(line, delimiter);
    const nome = (values[nameIndex] ?? "").trim().replace(/\s+/g, " ");
    const classLabel = (values[classIndex] ?? "").trim();
    const turma = classMap.get(normalize(classLabel));
    if (!nome) {
      result.errors.push(`Linha ${index + 2}: nome vazio.`);
      return;
    }
    if (!turma) {
      result.errors.push(`Linha ${index + 2}: turma “${classLabel || "vazia"}” não encontrada.`);
      return;
    }
    const key = `${normalize(nome)}|${turma}`;
    if (seen.has(key)) {
      result.duplicates.push(`${nome} · ${classLabel}`);
      return;
    }
    seen.add(key);
    result.rows.push({ nome, status: parseStatus(values[statusIndex] ?? ""), turma });
  });
  return result;
}

function detectDelimiter(header: string) {
  return [";", ",", "\t"].sort((left, right) => header.split(right).length - header.split(left).length)[0];
}

function splitCsvLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') { current += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === delimiter && !quoted) { values.push(current); current = ""; }
    else current += character;
  }
  values.push(current);
  return values;
}

function parseStatus(value: string): StudentStatus {
  const normalized = normalize(value);
  if (normalized === "inativo" || normalized === "inactive") return "Inativo";
  if (normalized === "transferido" || normalized === "transferida") return "Transferido";
  return "Ativo";
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
