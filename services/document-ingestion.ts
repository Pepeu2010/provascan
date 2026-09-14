export const UNIVERSAL_DOCUMENT_LIMITS = {
  maxBytes: 12 * 1024 * 1024,
  maxPages: 30,
  maxPixelsPerPage: 4_000_000,
} as const;

export type DocumentKind = "image" | "pdf";

type DocumentHeaderInput = {
  bytes: Uint8Array;
  mimeType: string;
  name: string;
  size: number;
};

export function validateDocumentHeader(input: DocumentHeaderInput): { kind: DocumentKind } {
  if (!input.name || input.name.length > 180 || /[\\/\u0000-\u001f]/.test(input.name) || input.name.includes("..")) {
    throw new Error("O nome do arquivo não é seguro. Renomeie o documento e tente novamente.");
  }
  if (input.size < 1 || input.size > UNIVERSAL_DOCUMENT_LIMITS.maxBytes) {
    throw new Error("O arquivo deve ter no máximo 12 MB.");
  }

  const bytes = input.bytes;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const isWebp = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
  const extension = input.name.toLowerCase().split(".").at(-1);

  if (isPdf && input.mimeType === "application/pdf" && extension === "pdf") return { kind: "pdf" };
  if (isJpeg && ["image/jpeg", "image/jpg"].includes(input.mimeType) && ["jpg", "jpeg"].includes(extension ?? "")) return { kind: "image" };
  if (isPng && input.mimeType === "image/png" && extension === "png") return { kind: "image" };
  if (isWebp && input.mimeType === "image/webp" && extension === "webp") return { kind: "image" };
  throw new Error("O conteúdo não corresponde ao formato informado. Envie um JPG, PNG, WebP ou PDF válido.");
}

export async function validateDocumentFile(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  return validateDocumentHeader({ bytes, mimeType: file.type, name: file.name, size: file.size });
}

export async function decodeDocumentPages(
  file: File,
  options: { onPage?: (page: number, total: number) => void; pageLimit?: number; signal?: AbortSignal } = {},
): Promise<HTMLCanvasElement[]> {
  const { kind } = await validateDocumentFile(file);
  if (options.signal?.aborted) throw new DOMException("Processamento cancelado.", "AbortError");
  if (kind === "image") return [await imageFileToCanvas(file)];

  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
  GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const loadingTask = getDocument({ data: await file.arrayBuffer() });
  const pdf = await loadingTask.promise;
  try {
    if (pdf.numPages > UNIVERSAL_DOCUMENT_LIMITS.maxPages) {
      throw new Error(`Este PDF tem ${pdf.numPages} páginas. O limite por envio é ${UNIVERSAL_DOCUMENT_LIMITS.maxPages}.`);
    }
    const pages: HTMLCanvasElement[] = [];
    const pagesToDecode = Math.min(pdf.numPages, Math.max(1, Math.trunc(options.pageLimit ?? pdf.numPages)));
    for (let pageNumber = 1; pageNumber <= pagesToDecode; pageNumber += 1) {
      if (options.signal?.aborted) throw new DOMException("Processamento cancelado.", "AbortError");
      options.onPage?.(pageNumber, pagesToDecode);
      const page = await pdf.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(2, Math.sqrt(UNIVERSAL_DOCUMENT_LIMITS.maxPixelsPerPage / Math.max(1, base.width * base.height)));
      if (scale < 0.2) throw new Error(`A página ${pageNumber} possui dimensões incompatíveis com o processamento seguro.`);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error(`Não foi possível preparar a página ${pageNumber}.`);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      pages.push(canvas);
      page.cleanup();
    }
    return pages;
  } finally {
    await loadingTask.destroy();
  }
}

export async function processDocumentPages(
  file: File,
  options: {
    onDecodedPage: (canvas: HTMLCanvasElement, page: number, total: number) => void | Promise<void>;
    onPage?: (page: number, total: number) => void;
    signal?: AbortSignal;
  },
) {
  const { kind } = await validateDocumentFile(file);
  throwIfCancelled(options.signal);
  if (kind === "image") {
    const canvas = await imageFileToCanvas(file);
    try {
      throwIfCancelled(options.signal);
      await options.onDecodedPage(canvas, 1, 1);
    } finally {
      releaseCanvas(canvas);
    }
    return 1;
  }

  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
  GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const loadingTask = getDocument({ data: await file.arrayBuffer() });
  const pdf = await loadingTask.promise;
  try {
    if (pdf.numPages > UNIVERSAL_DOCUMENT_LIMITS.maxPages) {
      throw new Error(`Este PDF tem ${pdf.numPages} páginas. O limite por envio é ${UNIVERSAL_DOCUMENT_LIMITS.maxPages}.`);
    }
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      throwIfCancelled(options.signal);
      options.onPage?.(pageNumber, pdf.numPages);
      const page = await pdf.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(2, Math.sqrt(UNIVERSAL_DOCUMENT_LIMITS.maxPixelsPerPage / Math.max(1, base.width * base.height)));
      if (scale < 0.2) throw new Error(`A página ${pageNumber} possui dimensões incompatíveis com o processamento seguro.`);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error(`Não foi possível preparar a página ${pageNumber}.`);
      try {
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        throwIfCancelled(options.signal);
        await options.onDecodedPage(canvas, pageNumber, pdf.numPages);
      } finally {
        releaseCanvas(canvas);
        page.cleanup();
      }
    }
    return pdf.numPages;
  } finally {
    await loadingTask.destroy();
  }
}

function throwIfCancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Processamento cancelado.", "AbortError");
}

function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 1;
  canvas.height = 1;
}

async function imageFileToCanvas(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    const maxSide = Math.max(bitmap.width, bitmap.height);
    const scale = maxSide > 2200 ? 2200 / maxSide : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Não foi possível preparar a imagem para leitura.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    bitmap.close();
  }
}
