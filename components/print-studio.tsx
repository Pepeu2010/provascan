"use client";

import "./print-studio.css";

import { CheckSquare, FileCheck2, FileText, LayoutTemplate, Printer, ScanLine, Type, UsersRound } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  createExamPrintDocument,
  createStudentCardsPrintDocument,
  type ExamPrintStudent,
  type ExamPrintKind,
} from "@/lib/exam-print-document";
import { defaultExamPrintOptions, normalizeExamPrintOptions, type AnswerSheetArea, type AnswerSheetModel, type ExamPrintOptions, type PrintSize, type PrintTemplate, type PrintTypeface } from "@/lib/exam-print-options";
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

function openStudentCardsWindow(exam: TeacherExam, students: ExamPrintStudent[], options: ExamPrintOptions) {
  const popup = window.open("", "_blank", "width=960,height=760");
  if (!popup) return false;
  popup.opener = null;
  popup.document.open();
  popup.document.write(createStudentCardsPrintDocument(exam, students, options));
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
  const cardModelId = useId();
  const cardAreaId = useId();
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
    <div className="print-studio__controls print-studio__controls--two">
      <label htmlFor={cardModelId}><ScanLine className="size-4" />Cartão-resposta<Select id={cardModelId} disabled={disabled} value={value.answerSheetModel} onChange={(event) => update("answerSheetModel", event.target.value as AnswerSheetModel)}><option value="provascan">Padrão ProvaScan</option><option value="fanucchi">Modelo A4 Fanucchi</option></Select></label>
      <label htmlFor={cardAreaId}>Área do cartão<Select id={cardAreaId} disabled={disabled || value.answerSheetModel !== "fanucchi"} value={value.answerSheetArea} onChange={(event) => update("answerSheetArea", event.target.value as AnswerSheetArea)}><option value="automatica">Automática pela prova</option><option value="HUMANAS">Humanas</option><option value="EXATAS">Exatas</option></Select></label>
    </div>
    <p className="print-studio__notice">O visual afeta a prova impressa. O cartão-resposta preserva as bolhas e a geometria para continuar compatível com a correção automática.</p>
  </section>;
}

export function PrintStudio({ exam, initialKind = "prova" }: { exam: TeacherExam; initialKind?: ExamPrintKind }) {
  const [kind, setKind] = useState<ExamPrintKind>(initialKind);
  const [options, setOptions] = useState<ExamPrintOptions>(() => normalizeExamPrintOptions(exam.printOptions));
  const [message, setMessage] = useState("");
  const [roster, setRoster] = useState<ExamPrintStudent[] | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const isCard = kind === "cartao";
  const isKey = kind === "gabarito";

  const print = () => setMessage(openExamPrint(exam, kind, options) ? `${isCard ? "Cartão-resposta" : isKey ? "Gabarito oficial" : "Prova"} aberto para impressão.` : "Permita pop-ups neste navegador para imprimir.");
  const loadRoster = async () => {
    setRosterLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/teacher-exams/${exam.id}/print-roster`, { cache: "no-store" });
      const payload = await response.json() as { error?: string; students?: ExamPrintStudent[] };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar os alunos.");
      const students = payload.students ?? [];
      setRoster(students);
      setSelectedStudentIds(students.map((student) => student.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar os alunos.");
    } finally { setRosterLoading(false); }
  };
  const selectedStudents = (roster ?? []).filter((student) => selectedStudentIds.includes(student.id));
  const printStudentCards = () => setMessage(selectedStudents.length && openStudentCardsWindow(exam, selectedStudents, options) ? `${selectedStudents.length} ${selectedStudents.length === 1 ? "cartão foi aberto" : "cartões foram abertos"} para impressão.` : selectedStudents.length ? "Permita pop-ups neste navegador para imprimir." : "Selecione ao menos um aluno.");

  return <section className="print-studio" aria-label="Preparar impressão">
    <header><div><h2>Preparar impressão</h2><p>Escolha um visual e abra a versão pronta para imprimir ou salvar em PDF.</p></div></header>
    <div className="print-studio__kind" role="tablist" aria-label="Material para imprimir">
      <button type="button" role="tab" aria-selected={kind === "prova"} className={kind === "prova" ? "is-active" : ""} onClick={() => setKind("prova")}><FileText className="size-4" />Prova</button>
      <button type="button" role="tab" aria-selected={isKey} className={isKey ? "is-active" : ""} onClick={() => setKind("gabarito")}><FileCheck2 className="size-4" />Gabarito oficial</button>
      <button type="button" role="tab" aria-selected={isCard} className={isCard ? "is-active" : ""} onClick={() => setKind("cartao")}><ScanLine className="size-4" />Cartão-resposta</button>
    </div>
    <ExamPresentationControls value={options} onChange={setOptions} />
    {isCard ? <><p className="print-studio__notice">O cartão mantém as bolhas A–E e a posição fixa para continuar compatível com a leitura automática.</p><section className="print-studio__batch"><header><div><h3><UsersRound className="size-4" />Cartões por aluno</h3><p>Gere um cartão já identificado para cada aluno da turma, em uma única impressão.</p></div>{roster === null ? <Button variant="secondary" disabled={rosterLoading} onClick={() => void loadRoster()}>{rosterLoading ? "Carregando…" : "Preparar lista"}</Button> : null}</header>{roster !== null ? roster.length ? <><div className="print-studio__batch-actions"><span>{selectedStudents.length} de {roster.length} alunos selecionados</span><div><button type="button" onClick={() => setSelectedStudentIds(roster.map((student) => student.id))}>Selecionar todos</button><button type="button" onClick={() => setSelectedStudentIds([])}>Limpar</button></div></div><div className="print-studio__roster">{roster.map((student) => <label key={student.id}><input type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={(event) => setSelectedStudentIds((current) => event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))} /><span><strong>{student.name}</strong><small>{student.className}</small></span></label>)}</div><Button onClick={printStudentCards}><CheckSquare className="size-4" />Imprimir cartões selecionados</Button></> : <p className="print-studio__empty">Nenhum aluno ativo foi encontrado para esta prova. Você ainda pode imprimir o cartão em branco.</p> : null}</section></> : null}
    {isKey ? <p className="print-studio__notice">O gabarito oficial mostra apenas o número da questão e a letra correta — sem enunciados ou alternativas.</p> : null}
    <footer><Button onClick={print}><Printer className="size-4" />Abrir para imprimir</Button>{message ? <p role="status" aria-live="polite">{message}</p> : null}</footer>
  </section>;
}
