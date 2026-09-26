"use client";

import "./print-studio.css";

import { CheckSquare, FileCheck2, FileText, LayoutTemplate, Printer, ScanLine, Type, UsersRound } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  createExamPrintDocument,
  createStudentCardsPrintDocument,
  type ExamPrintStudent,
  type ExamPrintKind,
} from "@/lib/exam-print-document";
import { getExamPrintReadiness } from "@/lib/exam-print-readiness";
import { defaultExamPrintOptions, normalizeExamPrintOptions, type AnswerSheetArea, type AnswerSheetModel, type ExamPrintOptions, type PrintSize, type PrintTemplate, type PrintTypeface } from "@/lib/exam-print-options";
import { buildCalibrationSheetHtml, buildPrintInstructionSheetHtml, getPrintPreflight } from "@/lib/print-preflight";
import type { TeacherExam } from "@/types/teacher-exams";

const templates: Array<{ value: PrintTemplate; title: string; detail: string }> = [
  { value: "institucional", title: "Institucional", detail: "Direto e profissional" },
  { value: "classico", title: "Clássico", detail: "Destaque para a leitura" },
  { value: "compacto", title: "Compacto", detail: "Economiza espaço" },
  { value: "simulado", title: "Simulado", detail: "Foco e ritmo de prova" },
  { value: "recuperacao", title: "Recuperação", detail: "Leitura mais acolhedora" },
  { value: "atividade", title: "Atividade curta", detail: "Leve para o dia a dia" },
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

function openReferenceWindow(title: string, content: string) {
  const popup = window.open("", "_blank", "width=960,height=760");
  if (!popup) return false;
  popup.opener = null;
  popup.document.open();
  popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title><style>@page{size:A4;margin:0}body{margin:0;background:#fff}</style></head><body>${content}<script>window.addEventListener('load',()=>window.print(),{once:true})</script></body></html>`);
  popup.document.close();
  return true;
}

function openExamPrint(exam: TeacherExam, kind: ExamPrintKind = "prova", options: ExamPrintOptions = defaultExamPrintOptions) {
  return openPrintWindow(exam, kind, options === defaultExamPrintOptions ? normalizeExamPrintOptions(exam.printOptions) : options);
}

function PrintPreview({ exam, kind, options }: { exam: TeacherExam; kind: ExamPrintKind; options: ExamPrintOptions }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const documentHtml = useMemo(() => createExamPrintDocument(exam, kind, options), [exam, kind, options]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => setScale(Math.min(1, Math.max(0.25, (container.clientWidth - 24) / 794)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const label = kind === "prova" ? "Prova" : kind === "gabarito" ? "Gabarito oficial" : "Cartão-resposta";
  return <aside className="print-studio__preview" aria-label={`Prévia A4: ${label}`}>
    <div className="print-studio__preview-heading"><div><strong>Prévia A4</strong><span>{label} · primeira página</span></div><span>Visualização</span></div>
    <div className="print-studio__preview-window" ref={containerRef}>
      <div className="print-studio__preview-page" style={{ width: 794 * scale, height: 1123 * scale }}>
        <iframe title={`Prévia de ${label}`} srcDoc={documentHtml} sandbox="" tabIndex={-1} style={{ width: 794, height: 1123, transform: `scale(${scale})` }} />
      </div>
    </div>
    <p>A prévia usa o mesmo documento da impressão. Confira todas as páginas na janela de impressão antes de confirmar.</p>
  </aside>;
}

export function ExamPresentationControls({ disabled = false, mode = "full", value, onChange }: { disabled?: boolean; mode?: "full" | "card"; value: ExamPrintOptions; onChange: (next: ExamPrintOptions) => void }) {
  const typefaceId = useId();
  const sizeId = useId();
  const alternativesId = useId();
  const cardModelId = useId();
  const cardAreaId = useId();
  const update = <T extends keyof ExamPrintOptions>(key: T, next: ExamPrintOptions[T]) => onChange({ ...value, [key]: next });
  return <section className="print-studio print-studio--editor" aria-label={mode === "card" ? "Modelo do cartão-resposta" : "Visual da prova"}>
    <header><div><h2><LayoutTemplate className="size-4" />{mode === "card" ? "Modelo do cartão-resposta" : "Visual da prova"}</h2><p>{mode === "card" ? "Escolha apenas o cartão que será impresso." : "Escolha um modelo agora. A prévia e a impressão usam estas escolhas."}</p></div></header>
    {mode === "full" ? <><div className="print-studio__templates" role="radiogroup" aria-label="Modelo visual">
      {templates.map((template) => <button key={template.value} type="button" disabled={disabled} role="radio" aria-checked={value.template === template.value} className={`print-studio__template print-studio__template--${template.value} ${value.template === template.value ? "is-selected" : ""}`} onClick={() => update("template", template.value)}><span aria-hidden="true"><i /><i /><i /></span><strong>{template.title}</strong><small>{template.detail}</small></button>)}
    </div>
    <div className="print-studio__controls print-studio__controls--three">
      <label htmlFor={typefaceId}><span className="print-studio__field-title"><Type className="size-4" aria-hidden="true" />Fonte</span><Select id={typefaceId} disabled={disabled} value={value.typeface} onChange={(event) => update("typeface", event.target.value as PrintTypeface)}><option value="limpa">Limpa e objetiva</option><option value="serifada">Clássica para leitura</option><option value="didatica">Didática e espaçada</option></Select></label>
      <label htmlFor={sizeId}>Tamanho<Select id={sizeId} disabled={disabled} value={value.size} onChange={(event) => update("size", event.target.value as PrintSize)}><option value="compacta">Compacto</option><option value="normal">Normal</option><option value="ampliada">Ampliado</option></Select></label>
      <label htmlFor={alternativesId}>Alternativas<Select id={alternativesId} disabled={disabled} value={value.alternativeLayout} onChange={(event) => update("alternativeLayout", event.target.value as ExamPrintOptions["alternativeLayout"])}><option value="lista">Uma por linha</option><option value="duas_colunas">Duas colunas</option></Select></label>
    </div></> : null}
    <div className="print-studio__controls print-studio__controls--two">
      <label htmlFor={cardModelId}><ScanLine className="size-4" />Cartão-resposta<Select id={cardModelId} disabled={disabled} value={value.answerSheetModel} onChange={(event) => update("answerSheetModel", event.target.value as AnswerSheetModel)}><option value="provascan">Padrão ProvaScan</option><option value="fanucchi">Modelo A4 Fanucchi</option></Select></label>
      <label htmlFor={cardAreaId}>Área do cartão<Select id={cardAreaId} disabled={disabled || value.answerSheetModel !== "fanucchi"} value={value.answerSheetArea} onChange={(event) => update("answerSheetArea", event.target.value as AnswerSheetArea)}><option value="automatica">Automática pela prova</option><option value="HUMANAS">Humanas</option><option value="EXATAS">Exatas</option></Select></label>
    </div>
    <p className="print-studio__notice">{mode === "card" ? "As bolhas A–E mantêm a posição fixa para continuar compatíveis com a correção automática." : "O visual afeta a prova impressa. O cartão-resposta preserva as bolhas e a geometria para continuar compatível com a correção automática."}</p>
  </section>;
}

export function PrintStudio({ exam, initialKind = "prova" }: { exam: TeacherExam; initialKind?: ExamPrintKind }) {
  const [kind, setKind] = useState<ExamPrintKind>(initialKind);
  const [options, setOptions] = useState<ExamPrintOptions>(() => normalizeExamPrintOptions(exam.printOptions));
  const [message, setMessage] = useState("");
  const [roster, setRoster] = useState<ExamPrintStudent[] | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [a4Confirmed, setA4Confirmed] = useState(false);
  const [scaleConfirmed, setScaleConfirmed] = useState(false);
  const isCard = kind === "cartao";
  const isKey = kind === "gabarito";
  const contentReadiness = getExamPrintReadiness(exam, kind, options);
  const paperReadiness = getPrintPreflight({ paperSize: a4Confirmed ? "A4" : "", scalePercent: scaleConfirmed ? 100 : 0 });
  const canPrint = contentReadiness.ready && paperReadiness.ready;

  const recordPrintEvent = (eventKind: "prova" | "gabarito" | "cartao" | "cartoes_individuais" | "etiquetas") => {
    void fetch(`/api/teacher-exams/${encodeURIComponent(exam.id)}/print-events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: eventKind }) }).catch(() => undefined);
  };
  const print = () => {
    if (!canPrint) return setMessage([...contentReadiness.issues, ...paperReadiness.warnings][0] ?? "Confira a prova antes de imprimir.");
    const opened = openExamPrint(exam, kind, options);
    if (opened) recordPrintEvent(kind);
    setMessage(opened ? `${isCard ? "Cartão-resposta" : isKey ? "Gabarito oficial" : "Prova"} aberto para impressão.` : "Permita pop-ups neste navegador para imprimir.");
  };
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
  const printStudentCards = () => {
    if (!canPrint) return setMessage([...contentReadiness.issues, ...paperReadiness.warnings][0] ?? "Confira a prova antes de imprimir.");
    const opened = Boolean(selectedStudents.length) && openStudentCardsWindow(exam, selectedStudents, options);
    if (opened) recordPrintEvent("cartoes_individuais");
    setMessage(opened ? `${selectedStudents.length} ${selectedStudents.length === 1 ? "cartão foi aberto" : "cartões foram abertos"} para impressão.` : selectedStudents.length ? "Permita pop-ups neste navegador para imprimir." : "Selecione ao menos um aluno.");
  };
  const printLabels = async () => {
    if (!canPrint) return setMessage([...contentReadiness.issues, ...paperReadiness.warnings][0] ?? "Confira a prova antes de imprimir.");
    if (!selectedStudents.length) return setMessage("Selecione ao menos um aluno.");
    setMessage("Gerando adesivos individuais…");
    try {
      const response = await fetch(`/api/teacher-exams/${exam.id}/answer-sheet-labels`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentIds: selectedStudents.map((student) => student.id) }) });
      const payload = await response.json() as { error?: string; labels?: Array<{ className: string; studentName: string; token: string }> };
      if (!response.ok || !payload.labels) throw new Error(payload.error ?? "Não foi possível gerar os adesivos.");
      const QRCode = await import("qrcode");
      const labels = await Promise.all(payload.labels.map(async (label) => ({ ...label, qr: await QRCode.toDataURL(label.token, { errorCorrectionLevel: "M", margin: 0, width: 180 }) })));
      const popup = window.open("", "_blank", "width=960,height=760");
      if (!popup) return setMessage("Permita pop-ups neste navegador para imprimir os adesivos.");
      popup.opener = null;
      popup.document.write(`<!doctype html><html lang="pt-BR"><head><title>Adesivos individuais</title><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;color:#111}.labels{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm}.label{min-height:46mm;border:.35mm solid #111;padding:3mm;display:grid;grid-template-columns:32mm 1fr;gap:3mm;align-items:center;break-inside:avoid}.label img{width:30mm;height:30mm}.label b{display:block;font-size:12px}.label small{display:block;margin-top:2mm;color:#444;font-size:10px}@media print{.label{break-inside:avoid}}</style></head><body><main class="labels">${labels.map((label) => `<article class="label"><img src="${label.qr}" alt="QR de identificação"/><div><b>${label.studentName.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</b><small>${label.className.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</small><small>Adesivo de identificação</small></div></article>`).join("")}</main><script>window.addEventListener('load',()=>window.print(),{once:true})</script></body></html>`);
      popup.document.close();
      recordPrintEvent("etiquetas");
      setMessage(`${labels.length} adesivos individuais foram abertos para impressão.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível gerar os adesivos."); }
  };

  return <section className="print-studio" aria-label="Preparar impressão">
    <header><div><h2>Preparar impressão</h2><p>Escolha o material, confira a prévia A4 e abra a versão para imprimir ou salvar em PDF.</p></div></header>
    <div className="print-studio__kind" role="tablist" aria-label="Material para imprimir">
      <button type="button" role="tab" aria-selected={kind === "prova"} className={kind === "prova" ? "is-active" : ""} onClick={() => setKind("prova")}><FileText className="size-4" />Prova</button>
      <button type="button" role="tab" aria-selected={isKey} className={isKey ? "is-active" : ""} onClick={() => setKind("gabarito")}><FileCheck2 className="size-4" />Gabarito oficial</button>
      <button type="button" role="tab" aria-selected={isCard} className={isCard ? "is-active" : ""} onClick={() => setKind("cartao")}><ScanLine className="size-4" />Cartão-resposta</button>
    </div>
    <div className="print-studio__workbench"><div className="print-studio__settings">
    {!isKey ? <ExamPresentationControls mode={isCard ? "card" : "full"} value={options} onChange={setOptions} /> : <p className="print-studio__notice">O gabarito oficial usa o número de cada questão e sua resposta correta, sem enunciados.</p>}
    {isCard ? <section className="print-studio__batch"><header><div><h3><UsersRound className="size-4" />Cartões por aluno</h3><p>{options.answerSheetModel === "fanucchi" ? "Imprima o cartão-base e os adesivos QR individuais separadamente." : "Gere um cartão já identificado para cada aluno da turma, em uma única impressão."}</p></div>{roster === null ? <Button variant="secondary" disabled={rosterLoading} onClick={() => void loadRoster()}>{rosterLoading ? "Carregando…" : "Preparar lista"}</Button> : null}</header>{roster !== null ? roster.length ? <><div className="print-studio__batch-actions"><span>{selectedStudents.length} de {roster.length} alunos selecionados</span><div><button type="button" onClick={() => setSelectedStudentIds(roster.map((student) => student.id))}>Selecionar todos</button><button type="button" onClick={() => setSelectedStudentIds([])}>Limpar</button></div></div><div className="print-studio__roster">{roster.map((student) => <label key={student.id}><input type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={(event) => setSelectedStudentIds((current) => event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))} /><span><strong>{student.name}</strong><small>{student.className}</small></span></label>)}</div>{options.answerSheetModel === "fanucchi" ? <Button disabled={!canPrint} onClick={() => void printLabels()}><CheckSquare className="size-4" />Imprimir adesivos QR</Button> : <Button disabled={!canPrint} onClick={printStudentCards}><CheckSquare className="size-4" />Imprimir cartões selecionados</Button>}</> : <p className="print-studio__empty">Nenhum aluno disponível para esta prova. Confira a turma e seu acesso com a gestão. Você ainda pode imprimir o cartão em branco.</p> : null}</section> : null}
    </div><PrintPreview exam={exam} kind={kind} options={options} /></div>
    <section className="print-studio__preflight" aria-labelledby="print-preflight-title">
      <div><h3 id="print-preflight-title">Antes de imprimir</h3><p>Confira a prova e use estas opções na janela da impressora.</p></div>
      {contentReadiness.issues.length ? <ul className="print-studio__issues" role="alert">{contentReadiness.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : <p className="print-studio__ready">{kind === "prova" ? "Prova pronta para abrir." : "Questões e gabarito prontos para este material."}</p>}
      <div className="print-studio__checks">
        <label><input type="checkbox" checked={a4Confirmed} onChange={(event) => setA4Confirmed(event.target.checked)} />Vou selecionar papel A4</label>
        <label><input type="checkbox" checked={scaleConfirmed} onChange={(event) => setScaleConfirmed(event.target.checked)} />Vou usar escala 100%, sem ajustar à página</label>
      </div>
      <div className="print-studio__references"><button type="button" onClick={() => { if (!openReferenceWindow("Calibração ProvaScan", buildCalibrationSheetHtml())) setMessage("Permita pop-ups para abrir a calibração."); }}>Folha de calibração</button><button type="button" onClick={() => { if (!openReferenceWindow("Instruções ProvaScan", buildPrintInstructionSheetHtml())) setMessage("Permita pop-ups para abrir as instruções."); }}>Instruções de impressão</button></div>
      <p className="print-studio__fineprint">Essa conferência não lê as configurações da impressora. Confira A4 e 100% novamente na janela de impressão; meça a folha de calibração antes de imprimir a turma toda.</p>
    </section>
    <footer><Button disabled={!canPrint} onClick={print}><Printer className="size-4" />Abrir para imprimir</Button>{message ? <p role="status" aria-live="polite">{message}</p> : null}</footer>
  </section>;
}
