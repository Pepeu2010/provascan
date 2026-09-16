import "server-only";

import { createHash } from "node:crypto";
import { parseImportedExamText } from "@/lib/exam-import-parser";
import type { ExamSourceType, TeacherExamInput } from "@/types/teacher-exams";
import { createTeacherExam, getTeacherExam, teacherExamClient, updateTeacherExam } from "@/services/teacher-exams";

export const MAX_EXAM_FILE_SIZE = 15 * 1024 * 1024;

const supported = {
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  pdf: "application/pdf",
  png: "image/png",
} as const;

type SupportedExtension = keyof typeof supported;

function extensionOf(name: string): SupportedExtension | null {
  const extension = name.split(".").pop()?.toLowerCase() as SupportedExtension | undefined;
  return extension && extension in supported ? extension : null;
}

function hasPrefix(bytes: Uint8Array, prefix: number[]) {
  return prefix.every((value, index) => bytes[index] === value);
}

function verifySignature(bytes: Uint8Array, extension: SupportedExtension) {
  if (extension === "pdf") return hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (extension === "png") return hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (extension === "jpg" || extension === "jpeg") return hasPrefix(bytes, [0xff, 0xd8, 0xff]);
  if (extension === "doc") return hasPrefix(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  return hasPrefix(bytes, [0x50, 0x4b, 0x03, 0x04]) || hasPrefix(bytes, [0x50, 0x4b, 0x05, 0x06]);
}

export function validateExamImportFile(input: { name: string; type: string; size: number; bytes: Uint8Array }) {
  const extension = extensionOf(input.name);
  if (!extension) throw new Error("Formato não aceito. Envie PDF, Word (.doc ou .docx), JPG ou PNG.");
  if (input.size < 1) throw new Error("O arquivo está vazio ou corrompido.");
  if (input.size > MAX_EXAM_FILE_SIZE) throw new Error("O arquivo ultrapassa o limite de 15 MB.");
  const expectedMime = supported[extension];
  if (input.type && input.type !== "application/octet-stream" && input.type !== expectedMime) {
    throw new Error("O tipo informado pelo arquivo não corresponde à sua extensão.");
  }
  if (!verifySignature(input.bytes, extension)) throw new Error("A assinatura do arquivo não corresponde ao formato informado. O envio foi bloqueado.");
  const sourceType: ExamSourceType = extension === "jpg" || extension === "jpeg" || extension === "png" ? "imagem" : extension;
  return { extension, mimeType: expectedMime, sourceType };
}

async function extractPdf(buffer: Buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true });
  const document = await task.promise;
  if (document.numPages > 100) throw new Error("O PDF ultrapassa o limite de 100 páginas.");
  const pages: string[] = [];
  for (let index = 1; index <= document.numPages; index += 1) {
    const page = await document.getPage(index);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => "str" in item ? item.str : "").join(" "));
    page.cleanup();
  }
  await task.destroy();
  return pages.join("\n");
}

async function extractWord(buffer: Buffer) {
  const { default: WordExtractor } = await import("word-extractor");
  const document = await new WordExtractor().extract(buffer);
  return [document.getHeaders({ includeFooters: false }), document.getBody(), document.getTextboxes({ includeHeadersAndFooters: false }), document.getFootnotes(), document.getEndnotes(), document.getFooters()].filter(Boolean).join("\n");
}

async function extractImage(buffer: Buffer) {
  const { recognize } = await import("tesseract.js");
  const result = await recognize(buffer, "por+eng", { logger: () => undefined });
  return result.data.text;
}

async function extractText(buffer: Buffer, sourceType: ExamSourceType) {
  if (sourceType === "pdf") return extractPdf(buffer);
  if (sourceType === "doc" || sourceType === "docx") return extractWord(buffer);
  return extractImage(buffer);
}

function safeStorageName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() ?? "bin";
  const stem = name.slice(0, Math.max(0, name.length - extension.length - 1)).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "prova";
  return `${stem}.${extension}`;
}

function fallbackExam(name: string): TeacherExamInput {
  return {
    audienceId: "",
    audienceLabel: "",
    description: "",
    estimatedDuration: null,
    examDate: new Date().toISOString().slice(0, 10),
    groupType: "GERAL",
    instructions: "",
    period: "",
    questions: [],
    subject: "",
    title: name.replace(/\.[^.]+$/, "").slice(0, 200) || "Prova importada",
    yearSegment: "OUTROS",
  };
}

export async function importTeacherExam(input: { actorId: string; creatorName: string; file: File }) {
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  const validated = validateExamImportFile({ bytes, name: input.file.name, size: input.file.size, type: input.file.type });
  const hash = createHash("sha256").update(bytes).digest("hex");
  const client = teacherExamClient();
  const { data: duplicate, error: duplicateError } = await client.from("exam_files").select("exam_id").eq("owner_id", input.actorId).eq("sha256", hash).maybeSingle();
  if (duplicateError) throw new Error(duplicateError.message);
  if (duplicate) {
    const existing = await getTeacherExam({ actorId: input.actorId, examId: String(duplicate.exam_id) });
    if (existing) return { duplicate: true, exam: existing, warnings: ["Este mesmo arquivo já foi importado. Abrimos a prova existente para evitar duplicação."] };
  }

  const importedAt = new Date().toISOString();
  const examId = await createTeacherExam({
    actorId: input.actorId,
    creatorName: input.creatorName,
    exam: fallbackExam(input.file.name),
    intent: "rascunho",
    source: {
      import_processing_status: "processando",
      imported_at: importedAt,
      needs_review: true,
      original_file_mime_type: validated.mimeType,
      original_file_name: input.file.name.slice(0, 260),
      original_file_size: input.file.size,
      source_type: validated.sourceType,
    },
  });
  const storagePath = `${input.actorId}/${examId}/${crypto.randomUUID()}-${safeStorageName(input.file.name)}`;
  const upload = await client.storage.from("exam-imports").upload(storagePath, bytes, { cacheControl: "0", contentType: validated.mimeType, upsert: false });
  if (upload.error) {
    await client.from("exams").update({ import_processing_error: "Não foi possível armazenar o arquivo original.", import_processing_status: "erro" }).eq("id", examId).eq("creator_id", input.actorId);
    throw new Error("Não foi possível armazenar o arquivo original com segurança.");
  }
  const fileId = crypto.randomUUID();
  const metadata = await client.from("exam_files").insert({
    exam_id: examId,
    id: fileId,
    mime_type: validated.mimeType,
    original_name: input.file.name.slice(0, 260),
    owner_id: input.actorId,
    sha256: hash,
    size_bytes: input.file.size,
    storage_path: storagePath,
  });
  if (metadata.error) {
    await client.storage.from("exam-imports").remove([storagePath]);
    throw new Error("Não foi possível registrar o arquivo original.");
  }

  try {
    const text = await extractText(Buffer.from(bytes), validated.sourceType);
    const parsed = parseImportedExamText(text, fallbackExam(input.file.name).title);
    const draft = { ...fallbackExam(input.file.name), instructions: parsed.instructions, questions: parsed.questions, subject: parsed.subject, title: parsed.title };
    await updateTeacherExam({ actorId: input.actorId, exam: draft, examId, expectedVersion: 1, intent: "rascunho" });
    await client.from("exams").update({ import_processing_error: null, import_processing_status: "pronto", needs_review: true }).eq("id", examId).eq("creator_id", input.actorId);
    const exam = await getTeacherExam({ actorId: input.actorId, examId });
    if (!exam) throw new Error("A prova importada não pôde ser recarregada.");
    return { duplicate: false, exam, warnings: parsed.warnings };
  } catch {
    const safeError = "Não foi possível interpretar todo o conteúdo. O arquivo original foi preservado para revisão manual.";
    await client.from("exams").update({ import_processing_error: safeError, import_processing_status: "erro", needs_review: true }).eq("id", examId).eq("creator_id", input.actorId);
    const exam = await getTeacherExam({ actorId: input.actorId, examId });
    if (!exam) throw new Error(safeError);
    return { duplicate: false, exam, warnings: [safeError] };
  }
}

export async function createOriginalFileDownload(actorId: string, examId: string, institutionalView = false) {
  const exam = await getTeacherExam({ actorId, examId, institutionalView });
  if (!exam) throw new Error("Arquivo não encontrado ou sem permissão de acesso.");
  let query = teacherExamClient().from("exam_files").select("storage_path,original_name").eq("exam_id", examId);
  if (!institutionalView) query = query.eq("owner_id", actorId);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Esta prova não possui arquivo original associado.");
  const signed = await teacherExamClient().storage.from("exam-imports").createSignedUrl(String(data.storage_path), 60, { download: String(data.original_name) });
  if (signed.error) throw new Error("Não foi possível preparar o download seguro.");
  return signed.data.signedUrl;
}
