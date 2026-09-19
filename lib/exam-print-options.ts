export const printTemplates = ["institucional", "classico", "compacto"] as const;
export const printTypefaces = ["limpa", "serifada", "didatica"] as const;
export const printSizes = ["compacta", "normal", "ampliada"] as const;
export const printAlternativeLayouts = ["lista", "duas_colunas"] as const;

export type PrintTemplate = (typeof printTemplates)[number];
export type PrintTypeface = (typeof printTypefaces)[number];
export type PrintSize = (typeof printSizes)[number];
export type PrintAlternativeLayout = (typeof printAlternativeLayouts)[number];

export type ExamPrintOptions = {
  size: PrintSize;
  template: PrintTemplate;
  typeface: PrintTypeface;
  alternativeLayout: PrintAlternativeLayout;
};

export const defaultExamPrintOptions: ExamPrintOptions = {
  alternativeLayout: "lista",
  size: "normal",
  template: "institucional",
  typeface: "limpa",
};

function includes<T extends readonly string[]>(items: T, value: unknown): value is T[number] {
  return typeof value === "string" && items.includes(value);
}

/** Accepts data saved by older drafts and only exposes supported print values. */
export function normalizeExamPrintOptions(value: unknown): ExamPrintOptions {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    alternativeLayout: includes(printAlternativeLayouts, source.alternativeLayout) ? source.alternativeLayout : defaultExamPrintOptions.alternativeLayout,
    size: includes(printSizes, source.size) ? source.size : defaultExamPrintOptions.size,
    template: includes(printTemplates, source.template) ? source.template : defaultExamPrintOptions.template,
    typeface: includes(printTypefaces, source.typeface) ? source.typeface : defaultExamPrintOptions.typeface,
  };
}
