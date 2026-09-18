"use client";

import "./print-studio.css";

import { FileText, Printer, ScanLine, Type } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  createExamPrintDocument,
  defaultExamPrintOptions,
  type ExamPrintKind,
  type ExamPrintOptions,
  type PrintSize,
  type PrintTemplate,
  type PrintTypeface,
} from "@/lib/exam-print-document";
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
  return openPrintWindow(exam, kind, options);
}

export function PrintStudio({ exam, initialKind = "prova" }: { exam: TeacherExam; initialKind?: ExamPrintKind }) {
  const [kind, setKind] = useState<ExamPrintKind>(initialKind);
  const [options, setOptions] = useState<ExamPrintOptions>(defaultExamPrintOptions);
  const [message, setMessage] = useState("");
  const typefaceId = useId();
  const sizeId = useId();
  const isCard = kind === "cartao";

  const update = <T extends keyof ExamPrintOptions>(key: T, value: ExamPrintOptions[T]) => setOptions((current) => ({ ...current, [key]: value }));
  const print = () => setMessage(openExamPrint(exam, kind, options) ? `${isCard ? "Cartão-resposta" : "Prova"} aberto para impressão.` : "Permita pop-ups neste navegador para imprimir.");

  return <section className="print-studio" aria-label="Preparar impressão">
    <header><div><h2>Preparar impressão</h2><p>Escolha um visual e abra a versão pronta para imprimir ou salvar em PDF.</p></div></header>
    <div className="print-studio__kind" role="tablist" aria-label="Material para imprimir">
      <button type="button" role="tab" aria-selected={kind === "prova"} className={kind === "prova" ? "is-active" : ""} onClick={() => setKind("prova")}><FileText className="size-4" />Prova</button>
      <button type="button" role="tab" aria-selected={isCard} className={isCard ? "is-active" : ""} onClick={() => setKind("cartao")}><ScanLine className="size-4" />Cartão-resposta</button>
    </div>
    <div className="print-studio__templates" role="radiogroup" aria-label="Modelo visual">
      {templates.map((template) => <button key={template.value} type="button" role="radio" aria-checked={options.template === template.value} className={`print-studio__template print-studio__template--${template.value} ${options.template === template.value ? "is-selected" : ""}`} onClick={() => update("template", template.value)}><span aria-hidden="true"><i /><i /><i /></span><strong>{template.title}</strong><small>{template.detail}</small></button>)}
    </div>
    <div className="print-studio__controls">
      <label htmlFor={typefaceId}><Type className="size-4" />Fonte<Select id={typefaceId} value={options.typeface} onChange={(event) => update("typeface", event.target.value as PrintTypeface)}><option value="limpa">Limpa e objetiva</option><option value="serifada">Clássica para leitura</option><option value="didatica">Didática e espaçada</option></Select></label>
      <label htmlFor={sizeId}>Tamanho<Select id={sizeId} value={options.size} onChange={(event) => update("size", event.target.value as PrintSize)}><option value="compacta">Compacto</option><option value="normal">Normal</option><option value="ampliada">Ampliado</option></Select></label>
    </div>
    {isCard ? <p className="print-studio__notice">O cartão mantém as bolhas A–E e a posição fixa para continuar compatível com a leitura automática.</p> : null}
    <footer><Button onClick={print}><Printer className="size-4" />Abrir para imprimir</Button>{message ? <p role="status" aria-live="polite">{message}</p> : null}</footer>
  </section>;
}
