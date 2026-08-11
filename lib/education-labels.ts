import type { ClassRoom } from "@/types/domain";

/** Presentation-only terminology. Stored identifiers and legacy values remain compatible. */
export function formatEducationalLabel(value: string) {
  return value
    .replace(/(\d+)\s*[º°oªa]?\s*anos?\b/gi, "$1º série")
    .replace(/(\d+)\s*[º°oªa]?\s*series?\b/gi, "$1º série")
    .replace(/^(\d+)\s*([A-Z]+)\s+Ensino Médio$/i, "$1º Série $2");
}

export function compareClassrooms(left: Pick<ClassRoom, "nome">, right: Pick<ClassRoom, "nome">) {
  const leftLabel = formatEducationalLabel(left.nome);
  const rightLabel = formatEducationalLabel(right.nome);
  const leftOrder = Number(leftLabel.match(/^\s*(\d+)/)?.[1] ?? Number.MAX_SAFE_INTEGER);
  const rightOrder = Number(rightLabel.match(/^\s*(\d+)/)?.[1] ?? Number.MAX_SAFE_INTEGER);
  return leftOrder - rightOrder || leftLabel.localeCompare(rightLabel, "pt-BR", { numeric: true, sensitivity: "base" });
}
