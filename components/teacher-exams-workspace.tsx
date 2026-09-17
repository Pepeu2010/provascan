"use client";

import "./teacher-exams-workspace.css";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive, ArrowDown, ArrowLeft, ArrowUp, BookOpenCheck, Check, ChevronRight, CircleAlert, Clock3,
  Copy, Download, Eye, FileText, FileUp, Filter, GripVertical, Image as ImageIcon, MoreHorizontal,
  Pencil, Plus, Printer, RotateCcw, Save, Search, Sparkles, Trash2, UploadCloud, X,
} from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { defaultQuestion, validateExamForPublication } from "@/lib/teacher-exam-validation";
import type { ExamLifecycleStatus, ExamQuestionType, TeacherExam, TeacherExamInput } from "@/types/teacher-exams";

type ApiError = { error?: string; details?: string[] };
type WorkspaceMode = "lista" | "escolha" | "editor";
type EditorStep = "informacoes" | "questoes" | "gabarito" | "revisao";
type StatusFilter = "todas" | ExamLifecycleStatus;

const LOCAL_DRAFT_KEY = "provascan:teacher-exam-draft:v1";
const typeLabels: Record<ExamQuestionType, string> = {
  associacao: "Associação",
  discursiva: "Discursiva",
  multipla_escolha: "Múltipla escolha",
  resposta_curta: "Resposta curta",
  verdadeiro_falso: "Verdadeiro ou falso",
};
const statusLabels: Record<ExamLifecycleStatus, string> = { aplicada: "Aplicada", arquivada: "Arquivada", publicada: "Publicada", rascunho: "Rascunho" };
const statusTones: Record<ExamLifecycleStatus, "neutral" | "warning" | "success"> = { aplicada: "success", arquivada: "neutral", publicada: "success", rascunho: "warning" };
const sourceLabels = { doc: "Word .doc", docx: "Word .docx", imagem: "Imagem", manual: "Manual", pdf: "PDF" } as const;

function emptyDraft(): TeacherExamInput {
  return {
    audienceId: "",
    audienceLabel: "",
    description: "",
    estimatedDuration: 60,
    examDate: new Date().toISOString().slice(0, 10),
    groupType: "GERAL",
    instructions: "",
    period: "",
    questions: [defaultQuestion(1)],
    subject: "",
    title: "",
    yearSegment: "OUTROS",
  };
}

function toDraft(exam: TeacherExam): TeacherExamInput {
  return {
    audienceId: exam.audienceId,
    audienceLabel: exam.audienceLabel,
    description: exam.description,
    estimatedDuration: exam.estimatedDuration,
    examDate: exam.examDate,
    groupType: exam.groupType,
    instructions: exam.instructions,
    period: exam.period,
    questions: exam.questions.map(({ id, imagePath, ...question }) => ({ ...question, id, imagePath })),
    subject: exam.subject,
    title: exam.title,
    yearSegment: exam.yearSegment,
  };
}

async function jsonApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await response.json() as T & ApiError;
  if (!response.ok) throw new Error(body.details?.join("\n") || body.error || "A operação não pôde ser concluída.");
  return body;
}

function formatDate(value: string) {
  if (!value) return "Sem data";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-BR").format(date);
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export function openPrint(exam: TeacherExam, answerSheet = false) {
  const printWindow = window.open("", "_blank", "width=950,height=760");
  if (!printWindow) return false;
  printWindow.opener = null;
  const alternatives = [...new Set(exam.questions.flatMap((question) => question.alternatives))].slice(0, 8);
  const body = answerSheet
    ? `<main class="sheet"><header><b>PROVASCAN · CARTÃO-RESPOSTA</b><h1>${escapeHtml(exam.title)}</h1><p>${escapeHtml(exam.audienceLabel)} · ${escapeHtml(formatDate(exam.examDate))}</p></header><section class="student">Aluno(a): <span></span></section><p class="instruction">Preencha completamente somente um círculo por questão.</p><div class="bubbles">${exam.questions.map((question, index) => `<div class="bubble-row"><strong>${index + 1}</strong>${alternatives.map((alternative) => `<span><i></i>${escapeHtml(alternative)}</span>`).join("")}</div>`).join("")}</div></main>`
    : `<main class="sheet"><header><b>PROVASCAN · PROVA</b><h1>${escapeHtml(exam.title)}</h1><p>${escapeHtml(exam.subject)} · ${escapeHtml(exam.audienceLabel)} · ${escapeHtml(formatDate(exam.examDate))}</p></header><section class="student">Aluno(a): <span></span></section>${exam.instructions ? `<aside><strong>Instruções</strong><p>${escapeHtml(exam.instructions).replaceAll("\n", "<br>")}</p></aside>` : ""}<ol>${exam.questions.map((question) => `<li><div class="prompt">${escapeHtml(question.prompt).replaceAll("\n", "<br>")}</div>${question.alternatives.length ? `<div class="alternatives">${question.alternatives.map((alternative, index) => `<p><b>${String.fromCharCode(65 + index)})</b> ${escapeHtml(alternative)}</p>`).join("")}</div>` : `<div class="writing"></div>`}</li>`).join("")}</ol></main>`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${answerSheet ? "Cartão" : "Prova"} — ${escapeHtml(exam.title)}</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;background:#eef1f5;color:#172033;font:13px Arial,sans-serif}.sheet{width:210mm;min-height:297mm;margin:0 auto;padding:18mm;background:white}header{border-bottom:3px solid #5736c8;padding-bottom:12px}header b{color:#5736c8;font-size:10px;letter-spacing:.12em}h1{margin:7px 0 5px;font-size:25px}.student{display:flex;gap:10px;margin:18px 0;font-weight:700}.student span{flex:1;border-bottom:1px solid #8893a5}aside{margin:16px 0;padding:12px;border-left:3px solid #8b75dc;background:#f7f5ff}aside p{line-height:1.55}ol{padding-left:25px}li{margin:0 0 22px;padding-left:6px;break-inside:avoid}.prompt{font-size:14px;line-height:1.55}.alternatives{margin-top:9px}.alternatives p{margin:6px 0}.writing{height:38mm;margin-top:10px;background:repeating-linear-gradient(transparent 0 8mm,#d5dae4 8.2mm 8.4mm)}.instruction{text-align:center}.bubbles{display:grid;grid-template-columns:repeat(2,1fr);gap:0 12mm;border:1px solid #ccd3df;padding:8mm}.bubble-row{display:grid;grid-template-columns:9mm repeat(${Math.max(alternatives.length, 2)},1fr);align-items:center;min-height:11mm;border-bottom:1px solid #e3e6ec}.bubble-row span{display:flex;align-items:center;gap:4px;font-size:10px}.bubble-row i{display:block;width:5mm;height:5mm;border:1.5px solid #172033;border-radius:50%}@media print{body{background:#fff}.sheet{width:auto;min-height:auto;padding:0}}</style></head><body>${body}<script>window.addEventListener('load',()=>requestAnimationFrame(()=>window.print()),{once:true})</script></body></html>`;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}

export function TeacherExamsWorkspace({ libraryOnly = false }: { libraryOnly?: boolean }) {
  const [exams, setExams] = useState<TeacherExam[]>([]);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<WorkspaceMode>("lista");
  const [step, setStep] = useState<EditorStep>("informacoes");
  const [active, setActive] = useState<TeacherExam | null>(null);
  const [draft, setDraft] = useState<TeacherExamInput>(emptyDraft);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(libraryOnly ? "publicada" : "todas");
  const [originFilter, setOriginFilter] = useState("todas");
  const [subjectFilter, setSubjectFilter] = useState("todas");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoSavedAt, setAutoSavedAt] = useState("");
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = async (selectId?: string) => {
    setLoading(true);
    try {
      const result = await jsonApi<{ exams: TeacherExam[]; readOnly: boolean }>("/api/teacher-exams?arquivadas=1");
      setExams(result.exams);
      setReadOnly(result.readOnly);
      if (selectId) {
        const selected = result.exams.find((exam) => exam.id === selectId);
        if (selected) openEditor(selected);
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível carregar as provas."); }
    finally { setLoading(false); }
  };

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setHasLocalDraft(Boolean(window.localStorage.getItem(LOCAL_DRAFT_KEY))), 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (mode !== "editor" || readOnly) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify({ draft, examId: active?.id ?? null, savedAt: new Date().toISOString() }));
      setHasLocalDraft(true);
      setAutoSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [active?.id, draft, mode, readOnly]);

  const filtered = useMemo(() => exams.filter((exam) => {
    if (libraryOnly && exam.status !== "publicada" && exam.status !== "aplicada") return false;
    if (statusFilter !== "todas" && exam.status !== statusFilter) return false;
    if (originFilter !== "todas" && exam.sourceType !== originFilter) return false;
    if (subjectFilter !== "todas" && exam.subject !== subjectFilter) return false;
    const haystack = `${exam.title} ${exam.subject} ${exam.audienceLabel} ${exam.creatorName}`.toLocaleLowerCase("pt-BR");
    return haystack.includes(query.trim().toLocaleLowerCase("pt-BR"));
  }), [exams, libraryOnly, originFilter, query, statusFilter, subjectFilter]);
  const subjects = [...new Set(exams.map((exam) => exam.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const counts = useMemo(() => ({
    aplicada: exams.filter((exam) => exam.status === "aplicada").length,
    arquivada: exams.filter((exam) => exam.status === "arquivada").length,
    publicada: exams.filter((exam) => exam.status === "publicada").length,
    rascunho: exams.filter((exam) => exam.status === "rascunho").length,
    todas: exams.length,
  }), [exams]);

  function openEditor(exam: TeacherExam) {
    setActive(exam);
    setDraft(toDraft(exam));
    setStep(exam.needsReview ? "questoes" : "informacoes");
    setMode("editor");
    setMessage("");
  }

  function startManual() {
    setActive(null);
    setDraft(emptyDraft());
    setStep("informacoes");
    setMode("editor");
    setMessage("");
  }

  function restoreLocalDraft() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(LOCAL_DRAFT_KEY) || "null") as { draft?: TeacherExamInput; examId?: string | null } | null;
      if (!stored?.draft) return;
      const storedExam = stored.examId ? exams.find((exam) => exam.id === stored.examId) ?? null : null;
      setActive(storedExam);
      setDraft(stored.draft);
      setMode("editor");
      setMessage("Rascunho recuperado deste aparelho.");
    } catch { setMessage("O rascunho local não pôde ser recuperado."); }
  }

  async function importFile(file: File) {
    if (busy) return;
    setBusy(true);
    setMessage("Enviando arquivo · depois vamos ler e organizar as questões.");
    const form = new FormData();
    form.set("file", file);
    try {
      setMessage("Lendo conteúdo e identificando questões…");
      const response = await fetch("/api/teacher-exams/import", { method: "POST", body: form });
      const result = await response.json() as { duplicate?: boolean; exam?: TeacherExam; warnings?: string[]; error?: string };
      if (!response.ok || !result.exam) throw new Error(result.error || "Não foi possível importar o arquivo.");
      setExams((current) => [result.exam!, ...current.filter((exam) => exam.id !== result.exam!.id)]);
      openEditor(result.exam);
      setStep("questoes");
      setMessage(result.warnings?.join(" ") || "Conteúdo preparado. Revise antes de publicar.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível importar o arquivo."); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  }

  async function save(intent: "rascunho" | "publicar") {
    if (busy || readOnly) return;
    if (intent === "publicar") {
      const errors = validateExamForPublication(draft);
      if (errors.length) { setMessage(errors.join("\n")); setStep(errors.some((error) => error.startsWith("Questão")) ? "questoes" : "informacoes"); return; }
      if (!window.confirm("Publicar esta prova agora? Ela ficará imediatamente disponível para uso.")) return;
    }
    setBusy(true);
    setMessage(intent === "publicar" ? "Publicando prova…" : "Salvando rascunho…");
    try {
      const url = active ? `/api/teacher-exams/${active.id}` : "/api/teacher-exams";
      const result = await jsonApi<{ examId?: string; message: string; version?: number }>(url, { method: active ? "PUT" : "POST", body: JSON.stringify({ exam: draft, expectedVersion: active?.version ?? null, intent }) });
      window.localStorage.removeItem(LOCAL_DRAFT_KEY);
      setMessage(result.message);
      await load(result.examId ?? active?.id);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar a prova."); }
    finally { setBusy(false); }
  }

  async function action(exam: TeacherExam, actionName: "duplicar" | "arquivar" | "restaurar" | "excluir") {
    if (busy || readOnly) return;
    if (actionName === "excluir" && !window.confirm(`Excluir “${exam.title}”? Provas com resultados são protegidas e não serão apagadas.`)) return;
    setBusy(true);
    try {
      const result = await jsonApi<{ examId: string; message: string }>(`/api/teacher-exams/${exam.id}`, { method: "PATCH", body: JSON.stringify({ action: actionName }) });
      setMessage(result.message);
      await load(actionName === "duplicar" ? result.examId : undefined);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível concluir a ação."); }
    finally { setBusy(false); }
  }

  if (mode === "escolha") return <CreationChoice busy={busy} fileInput={fileInput} onBack={() => setMode("lista")} onImport={importFile} onManual={startManual} />;
  if (mode === "editor") return <ExamEditor active={active} autoSavedAt={autoSavedAt} busy={busy} draft={draft} message={message} readOnly={readOnly} step={step} setDraft={setDraft} setStep={setStep} onBack={() => { setMode("lista"); setMessage(""); }} onSave={save} dragIndex={dragIndex} setDragIndex={setDragIndex} />;

  return (
    <div className="teacher-exams mx-auto grid max-w-[1420px] gap-5">
      <section className="teacher-exams__command">
        <div>
          <p className="teacher-exams__eyebrow">SUA BIBLIOTECA DE AVALIAÇÕES</p>
          <h1>{libraryOnly ? "Gabaritos das suas provas" : readOnly ? "Provas da instituição" : "Crie, publique e use. A prova é sua."}</h1>
          <p>{libraryOnly ? "Confira respostas, imprima provas e gere cartões-resposta." : readOnly ? "Consulte as provas e os arquivos originais da instituição. A criação pertence ao professor." : "Monte do zero ou transforme PDF, Word e imagem em uma prova editável. Sem fila, sem burocracia."}</p>
        </div>
        {!libraryOnly && !readOnly ? <div className="flex flex-col gap-2 sm:flex-row"><Button size="lg" variant="secondary" onClick={() => fileInput.current?.click()} disabled={busy}><FileUp className="size-4" />Importar arquivo</Button><Button size="lg" onClick={() => setMode("escolha")}><Plus className="size-4" />Nova prova</Button><input ref={fileInput} className="sr-only" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); }} /></div> : null}
      </section>

      {message ? <p className="teacher-exams__message whitespace-pre-line" role="status" aria-live="polite">{message}</p> : null}
      {hasLocalDraft && !readOnly && !libraryOnly ? <button type="button" className="teacher-exams__resume" onClick={restoreLocalDraft}><Clock3 className="size-5" /><span><strong>Há uma edição salva neste aparelho</strong><small>Continue exatamente de onde parou.</small></span><ChevronRight className="size-5" /></button> : null}

      <nav className="teacher-exams__stats" aria-label="Resumo das provas">
        {(["todas", "rascunho", "publicada", "aplicada", "arquivada"] as StatusFilter[]).map((status) => <button key={status} type="button" aria-pressed={statusFilter === status} className={statusFilter === status ? "is-active" : ""} onClick={() => setStatusFilter(status)}><strong>{counts[status]}</strong><span>{status === "todas" ? "Todas" : statusLabels[status]}</span></button>)}
      </nav>

      <Card className="teacher-exams__filters">
        <label className="teacher-exams__search"><Search className="size-4" aria-hidden="true" /><span className="sr-only">Buscar provas</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, disciplina, turma ou professor" /></label>
        <label><span className="sr-only">Filtrar por disciplina</span><Select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}><option value="todas">Todas as disciplinas</option>{subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</Select></label>
        <label><span className="sr-only">Filtrar por origem</span><Select value={originFilter} onChange={(event) => setOriginFilter(event.target.value)}><option value="todas">Todas as origens</option><option value="manual">Criação manual</option><option value="pdf">PDF</option><option value="doc">Word .doc</option><option value="docx">Word .docx</option><option value="imagem">Imagem</option></Select></label>
      </Card>

      {loading ? <ExamListSkeleton /> : filtered.length ? <section className="teacher-exams__grid" aria-label="Provas encontradas">{filtered.map((exam) => <ExamRow key={exam.id} exam={exam} busy={busy} readOnly={readOnly} onAction={action} onEdit={() => openEditor(exam)} onMessage={setMessage} />)}</section> : <EmptyLibrary filtered={exams.length > 0} readOnly={readOnly} onCreate={() => setMode("escolha")} />}
    </div>
  );
}

function CreationChoice({ busy, fileInput, onBack, onImport, onManual }: { busy: boolean; fileInput: React.RefObject<HTMLInputElement | null>; onBack: () => void; onImport: (file: File) => Promise<void>; onManual: () => void }) {
  return <div className="creation-hub">
    <Button variant="ghost" className="creation-hub__back" onClick={onBack}><ArrowLeft className="size-4" />Voltar para provas</Button>
    <header className="creation-hub__header"><p className="teacher-exams__eyebrow">NOVA PROVA</p><h1>Como você quer começar?</h1><p>Escolha o caminho mais rápido. Tudo continua editável antes da publicação.</p></header>
    <div className="creation-hub__options">
      <button type="button" className="creation-hub__option" onClick={onManual}><span className="creation-hub__icon"><Pencil className="size-6" /></span><strong>Criar manualmente</strong><p>Preencha as informações, escreva as questões e configure o gabarito passo a passo.</p><span>Começar em branco <ChevronRight className="size-4" /></span></button>
      <button type="button" className={`creation-hub__option ${busy ? "creation-hub__busy" : ""}`} disabled={busy} onClick={() => fileInput.current?.click()}><span className="creation-hub__icon"><UploadCloud className="size-6" /></span><strong>{busy ? "Preparando revisão…" : "Importar arquivo"}</strong><p>Envie um PDF, Word ou imagem para transformar o conteúdo em uma prova editável.</p><span>PDF, DOC, DOCX, JPG ou PNG · até 15 MB <ChevronRight className="size-4" /></span></button>
    </div>
    <input ref={fileInput} className="sr-only" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onImport(file); }} />
    <aside className="creation-hub__notice"><strong>Na importação:</strong> enviamos o original para armazenamento privado, validamos o formato real e preparamos uma revisão. Nada é publicado automaticamente.</aside>
  </div>;
}

function ExamEditor({ active, autoSavedAt, busy, draft, message, readOnly, step, setDraft, setStep, onBack, onSave, dragIndex, setDragIndex }: {
  active: TeacherExam | null; autoSavedAt: string; busy: boolean; draft: TeacherExamInput; message: string; readOnly: boolean; step: EditorStep;
  setDraft: React.Dispatch<React.SetStateAction<TeacherExamInput>>; setStep: (value: EditorStep) => void; onBack: () => void; onSave: (intent: "rascunho" | "publicar") => Promise<void>; dragIndex: number | null; setDragIndex: (index: number | null) => void;
}) {
  const { data } = useAppData();
  const steps: Array<{ id: EditorStep; label: string }> = [{ id: "informacoes", label: "1. Informações" }, { id: "questoes", label: "2. Questões" }, { id: "gabarito", label: "3. Gabarito" }, { id: "revisao", label: "4. Revisão" }];
  const publicationErrors = validateExamForPublication(draft);
  const totalWeight = draft.questions.reduce((sum, question) => sum + Number(question.weight || 0), 0);
  const updateQuestion = (index: number, changes: Partial<TeacherExamInput["questions"][number]>) => setDraft((current) => ({ ...current, questions: current.questions.map((question, questionIndex) => questionIndex === index ? { ...question, ...changes } : question) }));
  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= draft.questions.length || from === to) return;
    setDraft((current) => { const questions = [...current.questions]; const [item] = questions.splice(from, 1); questions.splice(to, 0, item); return { ...current, questions: questions.map((question, index) => ({ ...question, position: index + 1 })) }; });
  };
  return <div className="exam-editor mx-auto grid max-w-[1420px] gap-5"><header className="exam-editor__top"><Button variant="ghost" onClick={onBack}><ArrowLeft className="size-4" />Voltar</Button><div className="min-w-0 flex-1"><p className="teacher-exams__eyebrow">{active ? `VERSÃO ${active.version}` : "NOVA PROVA"}</p><h1>{draft.title || "Prova sem título"}</h1><p>{readOnly ? `Criada por ${active?.creatorName}` : autoSavedAt ? `Edição protegida neste aparelho às ${autoSavedAt}` : "Seu progresso é salvo neste aparelho"}</p></div>{active ? <Badge tone={statusTones[active.status]}>{statusLabels[active.status]}</Badge> : <Badge tone="warning">Novo rascunho</Badge>}</header>
    {active?.hasResults ? <div className="teacher-exams__warning"><CircleAlert className="size-5" /><span><strong>Histórico protegido.</strong> Esta prova já possui correções. Para mudar questões ou gabarito, duplique a prova.</span></div> : null}
    {active?.needsReview ? <div className="teacher-exams__warning"><Sparkles className="size-5" /><span><strong>Revise o conteúdo importado.</strong> Corrija os itens destacados antes de publicar.</span></div> : null}
    <nav className="exam-editor__steps" aria-label="Etapas da criação">{steps.map((item) => <button type="button" key={item.id} aria-current={step === item.id ? "step" : undefined} onClick={() => setStep(item.id)} className={step === item.id ? "is-active" : ""}>{item.label}</button>)}</nav>
    {message ? <p className="teacher-exams__message whitespace-pre-line" role="status" aria-live="polite">{message}</p> : null}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"><Card className="exam-editor__main">
      {step === "informacoes" ? <BasicInformation data={data} draft={draft} readOnly={readOnly} setDraft={setDraft} /> : null}
      {step === "questoes" ? <section><SectionHeading eyebrow="CONTEÚDO" title={`${draft.questions.length} ${draft.questions.length === 1 ? "questão" : "questões"}`} detail="Edite, duplique e reorganize. As mudanças ficam no conteúdo da prova, não no arquivo original." />{draft.questions.map((question, index) => <QuestionEditor key={question.id ?? `${index}-${question.position}`} index={index} question={question} total={draft.questions.length} readOnly={readOnly || Boolean(active?.hasResults)} onChange={(changes) => updateQuestion(index, changes)} onDelete={() => setDraft((current) => ({ ...current, questions: current.questions.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, position: itemIndex + 1 })) }))} onDuplicate={() => setDraft((current) => ({ ...current, questions: [...current.questions.slice(0, index + 1), { ...question, id: undefined, position: index + 2, prompt: `${question.prompt} (cópia)` }, ...current.questions.slice(index + 1)].map((item, itemIndex) => ({ ...item, position: itemIndex + 1 })) }))} onMove={(direction) => reorder(index, index + direction)} onDragStart={() => setDragIndex(index)} onDrop={() => { if (dragIndex != null) reorder(dragIndex, index); setDragIndex(null); }} />)}{!readOnly && !active?.hasResults ? <Button variant="secondary" className="mt-4 w-full" onClick={() => setDraft((current) => ({ ...current, questions: [...current.questions, defaultQuestion(current.questions.length + 1)] }))}><Plus className="size-4" />Adicionar questão</Button> : null}</section> : null}
      {step === "gabarito" ? <AnswerKeyEditor draft={draft} readOnly={readOnly || Boolean(active?.hasResults)} updateQuestion={updateQuestion} totalWeight={totalWeight} /> : null}
      {step === "revisao" ? <ExamReview draft={draft} errors={publicationErrors} active={active} /> : null}
    </Card><aside className="exam-editor__aside"><Card className="p-5"><p className="teacher-exams__eyebrow">RESUMO</p><dl><div><dt>Questões</dt><dd>{draft.questions.length}</dd></div><div><dt>Pontuação</dt><dd>{totalWeight.toLocaleString("pt-BR")}</dd></div><div><dt>Turma</dt><dd>{draft.audienceLabel || "Pendente"}</dd></div><div><dt>Disciplina</dt><dd>{draft.subject || "Pendente"}</dd></div></dl>{publicationErrors.length ? <div className="exam-editor__pending"><CircleAlert className="size-4" /><span>{publicationErrors.length} {publicationErrors.length === 1 ? "pendência" : "pendências"} para publicar</span></div> : <div className="exam-editor__ready"><Check className="size-4" /><span>Pronta para publicar</span></div>}</Card>{active?.originalFileName ? <Card className="p-5"><p className="teacher-exams__eyebrow">ARQUIVO ORIGINAL</p><p className="mt-3 truncate font-semibold">{active.originalFileName}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Armazenado de forma privada · {active.originalFileSize ? `${(active.originalFileSize / 1024 / 1024).toFixed(1)} MB` : ""}</p><Button asChild variant="secondary" className="mt-4 w-full"><a href={`/api/teacher-exams/${active.id}/original-file`} target="_blank" rel="noreferrer"><Download className="size-4" />Abrir original</a></Button></Card> : null}</aside></div>
    {!readOnly ? <footer className="exam-editor__actions"><Button variant="secondary" disabled={busy} loading={busy} onClick={() => void onSave("rascunho")}><Save className="size-4" />Salvar rascunho</Button><Button disabled={busy} loading={busy} onClick={() => void onSave("publicar")}><BookOpenCheck className="size-4" />Publicar prova</Button></footer> : null}</div>;
}

function BasicInformation({ data, draft, readOnly, setDraft }: { data: ReturnType<typeof useAppData>["data"]; draft: TeacherExamInput; readOnly: boolean; setDraft: React.Dispatch<React.SetStateAction<TeacherExamInput>> }) {
  const set = (changes: Partial<TeacherExamInput>) => setDraft((current) => ({ ...current, ...changes }));
  return <section><SectionHeading eyebrow="ETAPA 1" title="Informações da prova" detail="O professor responsável é preenchido pela sua conta e não pode ser trocado pelo formulário." /><div className="exam-form"><label className="sm:col-span-2">Nome da prova<Input disabled={readOnly} value={draft.title} onChange={(event) => set({ title: event.target.value })} placeholder="Ex.: Avaliação de Matemática — 1º Bimestre" /></label><label>Disciplina<Input disabled={readOnly} value={draft.subject} onChange={(event) => set({ subject: event.target.value })} placeholder="Matemática" /></label><label>Turma<Select disabled={readOnly} value={draft.audienceId} onChange={(event) => { const selected = data.classes.find((item) => item.id === event.target.value); set({ audienceId: selected?.id ?? "", audienceLabel: selected?.nome ?? "", groupType: selected?.groupType ?? "TURMA", yearSegment: selected?.yearSegment ?? "OUTROS" }); }}><option value="">Selecione a turma</option>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select></label><label>Série/Ano<Input disabled={readOnly} value={draft.yearSegment} onChange={(event) => set({ yearSegment: event.target.value })} placeholder="1º ano" /></label><label>Bimestre/Trimestre<Input disabled={readOnly} value={draft.period} onChange={(event) => set({ period: event.target.value })} placeholder="1º Bimestre" /></label><label>Data prevista<Input disabled={readOnly} type="date" value={draft.examDate} onChange={(event) => set({ examDate: event.target.value })} /></label><label>Tempo estimado (minutos)<Input disabled={readOnly} type="number" min={1} max={600} value={draft.estimatedDuration ?? ""} onChange={(event) => set({ estimatedDuration: event.target.value ? Number(event.target.value) : null })} /></label><label className="sm:col-span-2">Descrição opcional<Textarea disabled={readOnly} value={draft.description} onChange={(event) => set({ description: event.target.value })} placeholder="Contexto ou observação para sua organização" /></label><label className="sm:col-span-2">Instruções para os alunos<Textarea disabled={readOnly} value={draft.instructions} onChange={(event) => set({ instructions: event.target.value })} placeholder="Leia com atenção e marque apenas uma alternativa…" /></label></div></section>;
}

function QuestionEditor({ index, question, total, readOnly, onChange, onDelete, onDuplicate, onMove, onDragStart, onDrop }: { index: number; question: TeacherExamInput["questions"][number]; total: number; readOnly: boolean; onChange: (changes: Partial<TeacherExamInput["questions"][number]>) => void; onDelete: () => void; onDuplicate: () => void; onMove: (direction: -1 | 1) => void; onDragStart: () => void; onDrop: () => void }) {
  const objective = question.type === "multipla_escolha" || question.type === "verdadeiro_falso";
  return <article className={`question-editor ${question.needsReview ? "question-editor--review" : ""}`} draggable={!readOnly} onDragStart={onDragStart} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><header><span className="question-editor__grip" title="Arraste para reorganizar"><GripVertical className="size-4" /></span><strong>Questão {index + 1}</strong>{question.needsReview ? <Badge tone="warning">Revisar</Badge> : null}<div className="ml-auto flex gap-1"><button type="button" disabled={readOnly || index === 0} onClick={() => onMove(-1)} aria-label={`Mover questão ${index + 1} para cima`}><ArrowUp className="size-4" /></button><button type="button" disabled={readOnly || index === total - 1} onClick={() => onMove(1)} aria-label={`Mover questão ${index + 1} para baixo`}><ArrowDown className="size-4" /></button><button type="button" disabled={readOnly} onClick={onDuplicate} aria-label={`Duplicar questão ${index + 1}`}><Copy className="size-4" /></button><button type="button" disabled={readOnly || total === 1} onClick={onDelete} aria-label={`Excluir questão ${index + 1}`}><Trash2 className="size-4" /></button></div></header><div className="grid gap-3 p-4 sm:grid-cols-[220px_1fr]"><label>Tipo<Select disabled={readOnly} value={question.type} onChange={(event) => { const type = event.target.value as ExamQuestionType; onChange({ type, alternatives: type === "verdadeiro_falso" ? ["Verdadeiro", "Falso"] : type === "multipla_escolha" && question.alternatives.length < 2 ? ["", "", "", ""] : type === "multipla_escolha" ? question.alternatives : [], correctAnswers: [], correctionCriteria: type === "discursiva" || type === "resposta_curta" ? question.correctionCriteria : "", needsReview: false }); }}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label><label>Enunciado<Textarea disabled={readOnly} value={question.prompt} onChange={(event) => onChange({ prompt: event.target.value, needsReview: false })} placeholder="Digite o enunciado completo" /></label></div>{objective ? <div className="question-editor__alternatives">{question.alternatives.map((alternative, alternativeIndex) => <label key={alternativeIndex}><span>{String.fromCharCode(65 + alternativeIndex)}</span><Input disabled={readOnly || question.type === "verdadeiro_falso"} value={alternative} onChange={(event) => onChange({ alternatives: question.alternatives.map((item, itemIndex) => itemIndex === alternativeIndex ? event.target.value : item), needsReview: false })} placeholder={`Alternativa ${String.fromCharCode(65 + alternativeIndex)}`} />{question.type === "multipla_escolha" && question.alternatives.length > 2 && !readOnly ? <button type="button" onClick={() => onChange({ alternatives: question.alternatives.filter((_, itemIndex) => itemIndex !== alternativeIndex), correctAnswers: question.correctAnswers.filter((answer) => answer !== alternative) })} aria-label={`Remover alternativa ${String.fromCharCode(65 + alternativeIndex)}`}><X className="size-4" /></button> : null}</label>)}{question.type === "multipla_escolha" && !readOnly ? <button type="button" className="question-editor__add-alternative" disabled={question.alternatives.length >= 8} onClick={() => onChange({ alternatives: [...question.alternatives, ""] })}><Plus className="size-4" />Adicionar alternativa</button> : null}</div> : <div className="px-4 pb-4"><label>Critério de correção<Textarea disabled={readOnly} value={question.correctionCriteria} onChange={(event) => onChange({ correctionCriteria: event.target.value, needsReview: false })} placeholder="Explique o que deve aparecer na resposta para receber a pontuação" /></label></div>}</article>;
}

function AnswerKeyEditor({ draft, readOnly, updateQuestion, totalWeight }: { draft: TeacherExamInput; readOnly: boolean; updateQuestion: (index: number, changes: Partial<TeacherExamInput["questions"][number]>) => void; totalWeight: number }) {
  return <section><SectionHeading eyebrow="ETAPA 3" title="Gabarito e pontuação" detail="Confirme as respostas importadas. O ProvaScan nunca publica um gabarito extraído sem permitir sua revisão." /><div className="answer-key-summary"><span><strong>{draft.questions.length}</strong> questões</span><span><strong>{totalWeight.toLocaleString("pt-BR")}</strong> pontos</span><span><strong>{draft.questions.filter((question) => question.annulled).length}</strong> anuladas</span></div><div className="grid gap-3">{draft.questions.map((question, index) => { const objective = question.type === "multipla_escolha" || question.type === "verdadeiro_falso"; return <article key={question.id ?? index} className="answer-key-row"><div><strong>Q{index + 1}</strong><span>{typeLabels[question.type]}</span></div>{objective ? <label><span className="sr-only">Resposta correta da questão {index + 1}</span><Select disabled={readOnly || question.annulled} value={question.correctAnswers[0] ?? ""} onChange={(event) => updateQuestion(index, { correctAnswers: event.target.value ? [event.target.value] : [], needsReview: false })}><option value="">Sem resposta</option>{question.alternatives.filter(Boolean).map((alternative, alternativeIndex) => <option key={`${alternative}-${alternativeIndex}`} value={alternative}>{String.fromCharCode(65 + alternativeIndex)} — {alternative}</option>)}</Select></label> : <span className="answer-key-row__manual">Correção manual por critério</span>}<label className="answer-key-row__weight">Valor<Input disabled={readOnly} type="number" min={0} step="0.1" value={question.weight} onChange={(event) => updateQuestion(index, { weight: Number(event.target.value) })} /></label><Checkbox disabled={readOnly} checked={question.annulled} label="Anulada" onChange={(event) => updateQuestion(index, { annulled: event.target.checked, correctAnswers: event.target.checked ? [] : question.correctAnswers })} /></article>; })}</div></section>;
}

function ExamReview({ draft, errors, active }: { draft: TeacherExamInput; errors: string[]; active: TeacherExam | null }) {
  return <section><SectionHeading eyebrow="ETAPA 4" title="Revisão final" detail="Confira como a prova está organizada. Publicar a deixa pronta imediatamente, sem aprovação de outra pessoa." />{errors.length ? <div className="review-errors"><CircleAlert className="size-5" /><div><strong>Corrija antes de publicar</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div></div> : <div className="review-success"><Check className="size-5" /><div><strong>Tudo certo para publicar</strong><p>A prova ficará disponível para impressão, cartão-resposta e correção.</p></div></div>}<article className="exam-preview"><header><div><p>PROVASCAN · PRÉ-VISUALIZAÇÃO</p><h2>{draft.title || "Prova sem título"}</h2><span>{draft.subject || "Sem disciplina"} · {draft.audienceLabel || "Sem turma"} · {formatDate(draft.examDate)}</span></div><span>{draft.questions.length} questões</span></header>{draft.instructions ? <aside><strong>Instruções</strong><p>{draft.instructions}</p></aside> : null}<ol>{draft.questions.map((question, index) => <li key={question.id ?? index}><strong>{index + 1}.</strong><div><p>{question.prompt || "Enunciado pendente"}</p>{question.alternatives.map((alternative, alternativeIndex) => <span key={alternativeIndex}>{String.fromCharCode(65 + alternativeIndex)}) {alternative || "Alternativa pendente"}</span>)}</div></li>)}</ol></article>{active ? <div className="mt-4 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => openPrint(active)}><Printer className="size-4" />Imprimir prova atual</Button><Button variant="secondary" onClick={() => openPrint(active, true)}><FileText className="size-4" />Gerar cartão-resposta</Button></div> : null}</section>;
}

function SectionHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) { return <header className="section-heading"><p>{eyebrow}</p><h2>{title}</h2><span>{detail}</span></header>; }

function ExamRow({ exam, busy, readOnly, onAction, onEdit, onMessage }: { exam: TeacherExam; busy: boolean; readOnly: boolean; onAction: (exam: TeacherExam, action: "duplicar" | "arquivar" | "restaurar" | "excluir") => Promise<void>; onEdit: () => void; onMessage: (message: string) => void }) {
  const [menu, setMenu] = useState(false);
  const originIcon = exam.sourceType === "pdf" || exam.sourceType === "doc" || exam.sourceType === "docx" ? <FileText className="size-5" /> : exam.sourceType === "imagem" ? <ImageIcon className="size-5" /> : <Pencil className="size-5" />;
  return <Card className={`exam-card ${exam.status === "arquivada" ? "is-archived" : ""}`}>
    <header className="exam-card__header">
      <div className="exam-card__origin" aria-hidden="true">{originIcon}</div>
      <div className="exam-card__title"><p>{exam.subject || "Sem disciplina"}</p><button type="button" onClick={onEdit}>{exam.title}</button></div>
      <span className="exam-card__status"><Badge tone={statusTones[exam.status]}>{statusLabels[exam.status]}</Badge></span>
    </header>
    <div className="exam-card__body">
      {exam.needsReview ? <div className="exam-card__review"><Sparkles className="size-4" /><Badge tone="warning">Revisar importação</Badge></div> : null}
      <p>{exam.subject || "Sem disciplina"} · {exam.audienceLabel || "Sem turma"} · {exam.questions.length} {exam.questions.length === 1 ? "questão" : "questões"}</p>
      <div className="exam-card__facts"><span>Criada por {exam.creatorName}</span><span>Origem: {sourceLabels[exam.sourceType]}</span><span>Atualizada em {formatUpdatedAt(exam.updatedAt)}</span></div>
    </div>
    <footer className="exam-card__actions">
      <Button className="exam-card__primary" variant="secondary" onClick={onEdit}>{readOnly ? <Eye className="size-4" /> : <Pencil className="size-4" />}{readOnly ? "Abrir" : "Editar"}</Button>
      {exam.status === "publicada" || exam.status === "aplicada" ? <Button asChild><Link href={`/dashboard/correcao?prova=${encodeURIComponent(exam.id)}`}>Corrigir</Link></Button> : null}
      <div className="relative">
        <button type="button" className="exam-card__menu-button" aria-label={`Mais ações para ${exam.title}`} aria-expanded={menu} onClick={() => setMenu((value) => !value)}><MoreHorizontal className="size-5" /></button>
        {menu ? <div className="exam-card__menu">
          <button type="button" onClick={() => { setMenu(false); onMessage(openPrint(exam) ? "Prova aberta para impressão." : "Permita pop-ups para imprimir."); }}><Printer className="size-4" />Imprimir prova</button>
          <button type="button" onClick={() => { setMenu(false); onMessage(openPrint(exam, true) ? "Cartão-resposta aberto para impressão." : "Permita pop-ups para gerar o cartão."); }}><FileText className="size-4" />Gerar cartão-resposta</button>
          {exam.originalFileName ? <a href={`/api/teacher-exams/${exam.id}/original-file`} target="_blank" rel="noreferrer"><Download className="size-4" />Arquivo original</a> : null}
          {!readOnly ? <>
            <button type="button" disabled={busy} onClick={() => void onAction(exam, "duplicar")}><Copy className="size-4" />Duplicar prova</button>
            {exam.status === "arquivada" ? <button type="button" disabled={busy} onClick={() => void onAction(exam, "restaurar")}><RotateCcw className="size-4" />Restaurar</button> : <button type="button" disabled={busy} onClick={() => void onAction(exam, "arquivar")}><Archive className="size-4" />Arquivar</button>}
            <button type="button" className="text-[var(--error)]" disabled={busy} onClick={() => void onAction(exam, "excluir")}><Trash2 className="size-4" />Excluir</button>
          </> : null}
        </div> : null}
      </div>
    </footer>
  </Card>;
}

function EmptyLibrary({ filtered, readOnly, onCreate }: { filtered: boolean; readOnly: boolean; onCreate: () => void }) { return <Card className="teacher-exams__empty"><span><Filter className="size-6" /></span><h2>{filtered ? "Nenhuma prova corresponde aos filtros" : "Sua primeira prova começa aqui"}</h2><p>{filtered ? "Ajuste a busca, o status, a disciplina ou a origem." : readOnly ? "Ainda não há provas cadastradas na instituição." : "Crie manualmente ou importe um arquivo pronto para revisão."}</p>{!filtered && !readOnly ? <Button onClick={onCreate}><Plus className="size-4" />Criar prova</Button> : null}</Card>; }
function ExamListSkeleton() { return <div className="teacher-exams__grid" aria-label="Carregando provas">{[1, 2, 3].map((item) => <Card key={item} className="exam-card exam-card--skeleton" />)}</div>; }
