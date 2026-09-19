"use client";

import "./print-studio.css";

import { FileText, LayoutTemplate, Printer, ScanLine, Type } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  createExamPrintDocument,
  type ExamPrintKind,
} from "@/lib/exam-print-document";
import { defaultExamPrintOptions, normalizeExamPrintOptions, type ExamPrintOptions, type PrintSize, type PrintTemplate, type PrintTypeface } from "@/lib/exam-print-options";
import type { TeacherExam } from "@/types/teacher-exams";

const templates: Array<{ value: PrintTemplate; title: string; detail: string }> = [
  { value: "institucional", title: "Institucional", detail: "Direto e profissional" },
  { value: "classico", title: "Clássico", detail: "Destaque para a leitura" },
  { value: "compacto", title: "Compacto", detail: "Economiza espaço" },
];

function openPrintWindow(exam: TeacherExam, kind: ExamPrintKind, options: ExamPrintOptions) {
  const popup = window.open("", "_blank", "width=960,height=760");
  if (!popup) return false;
  popup.opener = null;
  popup.document.open();
  popup.document.write(createExamPrintDocument(exam, kind, options));
  popup.document.close();
  return true;
}

export function openExamPrint(exam: TeacherExam, kind: ExamPrintKind = "prova", options: ExamPrintOptions = defaultExamPrintOptions) {
  return openPrintWindow(exam, kind, options === defaultExamPrintOptions ? normalizeExamPrintOptions(exam.printOptions) : options);
}

export function ExamPresentationControls({ disabled = false, value, onChange }: { disabled?: boolean; value: ExamPrintOptions; onChange: (next: ExamPrintOptions) => void }) {
  const typefaceId = useId();
  const sizeId = useId();
  const alternativesId = useId();
  const update = <T extends keyof ExamPrintOptions>(key: T, next: ExamPrintOptions[T]) => onChange({ ...value, [key]: next });
  return <section className="print-studio print-studio--editor" aria-label="Visual da prova">
    <header><div><h2><LayoutTemplate className="size-4" />Visual da prova</h2><p>Escolha um modelo agora. A prévia e a impressão usam estas escolhas.</p></div></header>
    <div className="print-studio__templates" role="radiogroup" aria-label="Modelo visual">
      {templates.map((template) => <button key={template.value} type="button" disabled={disabled} role="radio" aria-checked={value.template === template.value} className={`print-studio__template print-studio__template--${template.value} ${value.template === template.value ? "is-selected" : ""}`} onClick={() => update("template", template.value)}><span aria-hidden="true"><i /><i /><i /></span><strong>{template.title}</strong><small>{template.detail}</small></button>)}
    </div>
    <div className="print-studio__controls print-studio__controls--three">
      <label htmlFor={typefaceId}><Type className="size-4" />Fonte<Select id={typefaceId} disabled={disabled} value={value.typeface} onChange={(event) => update("typeface", event.target.value as PrintTypeface)}><option value="limpa">Limpa e objetiva</option><option value="serifada">Clássica para leitura</option><option value="didatica">Didática e espaçada</option></Select></label>
      <label htmlFor={sizeId}>Tamanho<Select id={sizeId} disabled={disabled} value={value.size} onChange={(event) => update("size", event.target.value as PrintSize)}><option value="compacta">Compacto</option><option value="normal">Normal</option><option value="ampliada">Ampliado</option></Select></label>
      <label htmlFor={alternativesId}>Alternativas<Select id={alternativesId} disabled={disabled} value={value.alternativeLayout} onChange={(event) => update("alternativeLayout", event.target.value as ExamPrintOptions["alternativeLayout"])}><option value="lista">Uma por linha</option><option value="duas_colunas">Duas colunas</option></Select></label>
    </div>
    <p className="print-studio__notice">O visual afeta a prova impressa. O cartão-resposta preserva as bolhas e a geometria para continuar compatível com a correção automática.</p>
  </section>;
}

export function PrintStudio({ exam, initialKind = "prova" }: { exam: TeacherExam; initialKind?: ExamPrintKind }) {
  const [kind, setKind] = useState<ExamPrintKind>(initialKind);
  const [options, setOptions] = useState<ExamPrintOptions>(() => normalizeExamPrintOptions(exam.printOptions));
  const [message, setMessage] = useState("");
  const isCard = kind === "cartao";

  const print = () => setMessage(openExamPrint(exam, kind, options) ? `${isCard ? "Cartão-resposta" : "Prova"} aberto para impressão.` : "Permita pop-ups neste navegador para imprimir.");

  return <section className="print-studio" aria-label="Preparar impressão">
    <header><div><h2>Preparar impressão</h2><p>Escolha um visual e abra a versão pronta para imprimir ou salvar em PDF.</p></div></header>
    <div className="print-studio__kind" role="tablist" aria-label="Material para imprimir">
      <button type="button" role="tab" aria-selected={kind === "prova"} className={kind === "prova" ? "is-active" : ""} onClick={() => setKind("prova")}><FileText className="size-4" />Prova</button>
      <button type="button" role="tab" aria-selected={isCard} className={isCard ? "is-active" : ""} onClick={() => setKind("cartao")}><ScanLine className="size-4" />Cartão-resposta</button>
    </div>
    <ExamPresentationControls value={options} onChange={setOptions} />
    {isCard ? <p className="print-studio__notice">O cartão mantém as bolhas A–E e a posição fixa para continuar compatível com a leitura automática.</p> : null}
    <footer><Button onClick={print}><Printer className="size-4" />Abrir para imprimir</Button>{message ? <p role="status" aria-live="polite">{message}</p> : null}</footer>
  </section>;
}
