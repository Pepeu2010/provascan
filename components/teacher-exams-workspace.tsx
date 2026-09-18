"use client";

import "./teacher-exams-workspace.css";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive, ArrowDown, ArrowLeft, ArrowUp, BookOpenCheck, Check, ChevronRight, CircleAlert, Clock3,
  Copy, Download, Eye, FileText, FileUp, Filter, GripVertical, Image as ImageIcon, MoreHorizontal,
  Pencil, Plus, Printer, RotateCcw, Save, Search, Sparkles, Trash2, UploadCloud, X,
} from "lucide-react";
import { openExamPrint, PrintStudio } from "@/components/print-studio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { parseImportedExamText } from "@/lib/exam-import-parser";
import { defaultQuestion, validateExamForPublication } from "@/lib/teacher-exam-validation";
import type { ExamLifecycleStatus, ExamQuestionType, TeacherExam, TeacherExamInput } from "@/types/teacher-exams";

type ApiError = { error?: string; details?: string[] };
type WorkspaceMode = "lista" | "escolha" | "editor";
type EditorStep = "informacoes" | "questoes" | "gabarito" | "aplicacao" | "revisao";
type StatusFilter = "todas" | ExamLifecycleStatus;
type ExamAudience = { subjects: Array<{ id: string; name: string }>; classes: Array<{ id: string; name: string }>; teachers: Array<{ id: string; name: string; classIds: string[] }> };

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
    subjectId: null,
    assignmentGroups: [],
    title: "",
    yearSegment: "",
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
    subjectId: exam.subjectId ?? null,
    assignmentGroups: exam.assignmentGroups ?? [],
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

export function openPrint(exam: TeacherExam, answerSheet = false) {
  return openExamPrint(exam, answerSheet ? "cartao" : "prova");
}

export function TeacherExamsWorkspace({ libraryOnly = false }: { libraryOnly?: boolean }) {
  const [exams, setExams] = useState<TeacherExam[]>([]);
  const [canCreateExam, setCanCreateExam] = useState(false);
  const [institutionalView, setInstitutionalView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permissionsResolved, setPermissionsResolved] = useState(false);
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
  const [viewerId, setViewerId] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const load = async (selectId?: string) => {
    setLoading(true);
    setPermissionsResolved(false);
    try {
      const result = await jsonApi<{
        capabilities: { canCreateExam: boolean };
        exams: TeacherExam[];
        institutionalView: boolean;
        viewer: { id: string };
      }>("/api/teacher-exams?arquivadas=1");
      setExams(result.exams);
      setCanCreateExam(result.capabilities.canCreateExam);
      setInstitutionalView(result.institutionalView);
      setViewerId(result.viewer.id);
      if (selectId) {
        const selected = result.exams.find((exam) => exam.id === selectId);
        if (selected) openEditor(selected);
      }
    } catch (error) {
      setCanCreateExam(false);
      setViewerId("");
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar as provas.");
    } finally {
      setPermissionsResolved(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await jsonApi<{
          capabilities: { canCreateExam: boolean };
          exams: TeacherExam[];
          institutionalView: boolean;
          viewer: { id: string };
        }>("/api/teacher-exams?arquivadas=1");
        if (cancelled) return;
        setExams(result.exams);
        setCanCreateExam(result.capabilities.canCreateExam);
        setInstitutionalView(result.institutionalView);
        setViewerId(result.viewer.id);
      } catch (error) {
        if (cancelled) return;
        setCanCreateExam(false);
        setViewerId("");
        setMessage(error instanceof Error ? error.message : "Não foi possível carregar as provas.");
      } finally {
        if (!cancelled) {
          setPermissionsResolved(true);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setHasLocalDraft(Boolean(window.localStorage.getItem(LOCAL_DRAFT_KEY)));
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (mode !== "editor" || !canCreateExam || (active && active.creatorId !== viewerId)) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify({ draft, examId: active?.id ?? null, savedAt: new Date().toISOString() }));
      setHasLocalDraft(true);
      setAutoSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [active, canCreateExam, draft, mode, viewerId]);

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
    if (busy || !canCreateExam || (active && active.creatorId !== viewerId)) return;
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
    if (busy || !canCreateExam || exam.creatorId !== viewerId) return;
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
  if (mode === "editor") return <ExamEditor active={active} autoSavedAt={autoSavedAt} busy={busy} draft={draft} message={message} readOnly={!canCreateExam || Boolean(active && active.creatorId !== viewerId)} step={step} setDraft={setDraft} setStep={setStep} viewerId={viewerId} onBack={() => { setMode("lista"); setMessage(""); }} onSave={save} dragIndex={dragIndex} setDragIndex={setDragIndex} />;

  return (
    <div className="teacher-exams mx-auto grid max-w-[1420px] gap-5">
      <section className="teacher-exams__command">
        <div>
          <p className="teacher-exams__eyebrow">SUA BIBLIOTECA DE AVALIAÇÕES</p>
          <h1>{libraryOnly ? "Gabaritos das suas provas" : institutionalView ? "Provas da instituição" : "Crie, publique e use. A prova é sua."}</h1>
          <p>{libraryOnly ? "Confira respostas, imprima provas e gere cartões-resposta." : institutionalView ? "Consulte a instituição e crie suas próprias provas quando necessário." : "Monte do zero ou transforme PDF, Word e imagem em uma prova editável. Sem fila, sem burocracia."}</p>
        </div>
        {!libraryOnly ? <div className="teacher-exams__command-actions">{!permissionsResolved ? <ExamCreationActionsSkeleton /> : canCreateExam ? <><Button size="lg" variant="secondary" onClick={() => fileInput.current?.click()} disabled={busy}><FileUp className="size-4" />Importar arquivo</Button><Button size="lg" onClick={() => setMode("escolha")}><Plus className="size-4" />Nova prova</Button><input ref={fileInput} className="sr-only" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); }} /></> : null}</div> : null}
      </section>

      {message ? <p className="teacher-exams__message whitespace-pre-line" role="status" aria-live="polite">{message}</p> : null}
      {hasLocalDraft && canCreateExam && !libraryOnly ? <button type="button" className="teacher-exams__resume" onClick={restoreLocalDraft}><Clock3 className="size-5" /><span><strong>Há uma edição salva neste aparelho</strong><small>Continue exatamente de onde parou.</small></span><ChevronRight className="size-5" /></button> : null}

      <nav className="teacher-exams__stats" aria-label="Resumo das provas">
        {(["todas", "rascunho", "publicada", "aplicada", "arquivada"] as StatusFilter[]).map((status) => <button key={status} type="button" aria-pressed={statusFilter === status} className={statusFilter === status ? "is-active" : ""} onClick={() => setStatusFilter(status)}><strong>{counts[status]}</strong><span>{status === "todas" ? "Todas" : statusLabels[status]}</span></button>)}
      </nav>

      <Card className="teacher-exams__filters">
        <label className="teacher-exams__search"><Search className="size-4" aria-hidden="true" /><span className="sr-only">Buscar provas</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, disciplina, turma ou professor" /></label>
        <label><span className="sr-only">Filtrar por disciplina</span><Select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}><option value="todas">Todas as disciplinas</option>{subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</Select></label>
        <label><span className="sr-only">Filtrar por origem</span><Select value={originFilter} onChange={(event) => setOriginFilter(event.target.value)}><option value="todas">Todas as origens</option><option value="manual">Criação manual</option><option value="pdf">PDF</option><option value="doc">Word .doc</option><option value="docx">Word .docx</option><option value="imagem">Imagem</option></Select></label>
      </Card>

      {loading ? <ExamListSkeleton /> : filtered.length ? <section className="teacher-exams__grid" aria-label="Provas encontradas">{filtered.map((exam) => <ExamRow key={exam.id} exam={exam} busy={busy} readOnly={!canCreateExam || exam.creatorId !== viewerId} onAction={action} onEdit={() => openEditor(exam)} onMessage={setMessage} />)}</section> : <EmptyLibrary filtered={exams.length > 0} readOnly={!canCreateExam} onCreate={() => setMode("escolha")} />}
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

function normalizeYearSegment(value: string) {
  const match = value.trim().match(/^([123])(?:\s*[ºª°])?(?:\s*(?:ano|série))?$/i);
  return match?.[1] ?? "OUTROS";
}

function wholeYearLabel(value: string) {
  return ["1", "2", "3"].includes(value) ? `Todo o ${value}º ano` : "Todo o ano informado";
}

function ExamCreationActionsSkeleton() {
  return <div className="teacher-exams__command-skeleton" aria-busy="true" aria-label="Verificando permissões para criar prova"><span /><span /></div>;
}

function ExamEditor({ active, autoSavedAt, busy, draft, message, readOnly, step, setDraft, setStep, viewerId, onBack, onSave, dragIndex, setDragIndex }: {
  active: TeacherExam | null; autoSavedAt: string; busy: boolean; draft: TeacherExamInput; message: string; readOnly: boolean; step: EditorStep;
  setDraft: React.Dispatch<React.SetStateAction<TeacherExamInput>>; setStep: (value: EditorStep) => void; viewerId: string; onBack: () => void; onSave: (intent: "rascunho" | "publicar") => Promise<void>; dragIndex: number | null; setDragIndex: (index: number | null) => void;
}) {
  const [audience, setAudience] = useState<ExamAudience>({ subjects: [], classes: [], teachers: [] });
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [targetQuestionCount, setTargetQuestionCount] = useState(10);
  const [bulkExamText, setBulkExamText] = useState("");
  const subjectId = draft.subjectId;
  useEffect(() => {
    let cancelled = false;
    if (!subjectId) return () => { cancelled = true; };
    void (async () => {
      setAudienceLoading(true);
      try {
        const result = await jsonApi<Partial<ExamAudience>>(`/api/teacher-exams/audience?subjectId=${encodeURIComponent(subjectId)}`);
        if (!cancelled) setAudience({ classes: result.classes ?? [], subjects: result.subjects ?? [], teachers: result.teachers ?? [] });
      } catch { if (!cancelled) setAudience({ classes: [], subjects: [], teachers: [] }); }
      finally { if (!cancelled) setAudienceLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [subjectId]);
  const steps: Array<{ id: EditorStep; label: string }> = [{ id: "informacoes", label: "Informações" }, { id: "questoes", label: "Questões" }, { id: "gabarito", label: "Gabarito" }, { id: "aplicacao", label: "Aplicação" }, { id: "revisao", label: "Revisão" }];
  const publicationErrors = validateExamForPublication(draft);
  const totalWeight = draft.questions.reduce((sum, question) => sum + Number(question.weight || 0), 0);
  const updateQuestion = (index: number, changes: Partial<TeacherExamInput["questions"][number]>) => setDraft((current) => ({ ...current, questions: current.questions.map((question, questionIndex) => questionIndex === index ? { ...question, ...changes } : question) }));
  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= draft.questions.length || from === to) return;
    setDraft((current) => { const questions = [...current.questions]; const [item] = questions.splice(from, 1); questions.splice(to, 0, item); return { ...current, questions: questions.map((question, index) => ({ ...question, position: index + 1 })) }; });
  };
  const completeQuestionsUntil = (requestedTotal: number) => {
    const total = Math.max(1, Math.min(200, Math.floor(Number(requestedTotal) || 1)));
    setTargetQuestionCount(total);
    setDraft((current) => {
      const missing = Math.max(0, total - current.questions.length);
      if (!missing) return current;
      return { ...current, questions: [...current.questions, ...Array.from({ length: missing }, (_, index) => defaultQuestion(current.questions.length + index + 1))] };
    });
  };
  const applyPastedExam = () => {
    const parsed = parseImportedExamText(bulkExamText, draft.title || "Prova sem título");
    if (!bulkExamText.trim()) return;
    const hasCurrentContent = draft.questions.some((question) => question.prompt.trim() || question.alternatives.some((alternative) => alternative.trim()));
    if (hasCurrentContent && !window.confirm("Substituir as questões atuais pelo texto colado? Você pode voltar a editar tudo depois.")) return;
    setDraft((current) => {
      const subject = current.subject || parsed.subject;
      const matchedSubject = audience.subjects.find((item) => item.name.trim().toLocaleLowerCase("pt-BR") === subject.trim().toLocaleLowerCase("pt-BR"));
      return {
        ...current,
        instructions: current.instructions || parsed.instructions,
        questions: parsed.questions,
        subject,
        subjectId: current.subjectId ?? matchedSubject?.id ?? null,
        title: current.title || parsed.title,
      };
    });
    setTargetQuestionCount(parsed.questions.length || targetQuestionCount);
    setBulkExamText("");
  };
  return <div className="exam-studio"><header className="exam-studio__header"><Button variant="ghost" onClick={onBack}><ArrowLeft className="size-4" />Voltar</Button><div className="min-w-0 flex-1"><p className="teacher-exams__eyebrow">{active ? `VERSÃO ${active.version}` : "NOVA PROVA"}</p><h1>{draft.title || "Prova sem título"}</h1><p>{readOnly ? `Criada por ${active?.creatorName}` : autoSavedAt ? `Edição protegida neste aparelho às ${autoSavedAt}` : "Seu progresso é salvo neste aparelho"}</p></div>{active ? <Badge tone={statusTones[active.status]}>{statusLabels[active.status]}</Badge> : <Badge tone="warning">Novo rascunho</Badge>}</header>
    {active?.hasResults ? <div className="teacher-exams__warning"><CircleAlert className="size-5" /><span><strong>Histórico protegido.</strong> Esta prova já possui correções. Para mudar questões ou gabarito, duplique a prova.</span></div> : null}
    {active?.needsReview ? <div className="teacher-exams__warning"><Sparkles className="size-5" /><span><strong>Revise o conteúdo importado.</strong> Corrija os itens destacados antes de publicar.</span></div> : null}
    <nav className="exam-studio__steps" aria-label="Etapas da criação">{steps.map((item, index) => <button type="button" key={item.id} aria-current={step === item.id ? "step" : undefined} onClick={() => setStep(item.id)} className={step === item.id ? "is-active" : ""}><span aria-hidden="true">{index + 1}</span><strong>{item.label}</strong></button>)}</nav>
    {message ? <p className="teacher-exams__message whitespace-pre-line" role="status" aria-live="polite">{message}</p> : null}
    <div className="exam-studio__layout"><Card className="exam-studio__canvas">
      {step === "informacoes" ? <BasicInformation draft={draft} readOnly={readOnly} setDraft={setDraft} /> : null}
      {step === "questoes" ? <section><SectionHeading eyebrow="CONTEÚDO" title={`${draft.questions.length} ${draft.questions.length === 1 ? "questão" : "questões"}`} detail="Monte a estrutura em lote, cole uma prova já digitada ou continue editando item por item." />{!readOnly && !active?.hasResults ? <><div className="question-batch" aria-label="Criar questões em lote"><div><strong>Monte a estrutura rapidamente</strong><span>Escolha o total de questões. O ProvaScan completa somente as que faltam.</span></div><div className="question-batch__controls"><div className="question-batch__presets" aria-label="Atalhos de quantidade">{[10, 20, 45, 90].map((total) => <button key={total} type="button" onClick={() => completeQuestionsUntil(total)}>{total}</button>)}</div><label><span>Total de questões</span><Input type="number" min={1} max={200} value={targetQuestionCount} onChange={(event) => setTargetQuestionCount(Number(event.target.value))} /></label><Button variant="secondary" onClick={() => completeQuestionsUntil(targetQuestionCount)} disabled={draft.questions.length >= Math.max(1, Math.min(200, targetQuestionCount || 1))}><Plus className="size-4" />Completar até {Math.max(1, Math.min(200, targetQuestionCount || 1))}</Button></div></div><details className="question-paste"><summary>Colar prova completa com gabarito</summary><p>Cole o texto de Word, PDF ou outro editor. Use <strong>1. Enunciado</strong>, alternativas <strong>A) ...</strong> e, no final, <strong>Gabarito / 1 - B</strong>.</p><Textarea rows={8} value={bulkExamText} onChange={(event) => setBulkExamText(event.target.value)} placeholder={"Avaliação de Matemática\nDisciplina: Matemática\n\n1. Quanto é 2 + 2?\nA) 3\nB) 4\nC) 5\n\nGabarito\n1 - B"} /><div><Button variant="secondary" disabled={!bulkExamText.trim()} onClick={applyPastedExam}><FileText className="size-4" />Organizar texto em questões</Button><span>As questões atuais só são substituídas após sua confirmação.</span></div></details></> : null}{draft.questions.map((question, index) => <QuestionEditor key={question.id ?? `${index}-${question.position}`} index={index} question={question} total={draft.questions.length} readOnly={readOnly || Boolean(active?.hasResults)} onChange={(changes) => updateQuestion(index, changes)} onDelete={() => setDraft((current) => ({ ...current, questions: current.questions.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, position: itemIndex + 1 })) }))} onDuplicate={() => setDraft((current) => ({ ...current, questions: [...current.questions.slice(0, index + 1), { ...question, id: undefined, position: index + 2, prompt: `${question.prompt} (cópia)` }, ...current.questions.slice(index + 1)].map((item, itemIndex) => ({ ...item, position: itemIndex + 1 })) }))} onMove={(direction) => reorder(index, index + direction)} onDragStart={() => setDragIndex(index)} onDrop={() => { if (dragIndex != null) reorder(dragIndex, index); setDragIndex(null); }} />)}{!readOnly && !active?.hasResults ? <Button variant="secondary" className="mt-4 w-full" onClick={() => completeQuestionsUntil(draft.questions.length + 1)}><Plus className="size-4" />Adicionar uma questão</Button> : null}</section> : null}
      {step === "gabarito" ? <AnswerKeyEditor draft={draft} readOnly={readOnly || Boolean(active?.hasResults)} setDraft={setDraft} updateQuestion={updateQuestion} totalWeight={totalWeight} /> : null}
      {step === "aplicacao" ? <ApplicationEditor audience={audience} draft={draft} loading={audienceLoading} readOnly={readOnly} setDraft={setDraft} viewerId={viewerId} /> : null}
      {step === "revisao" ? <ExamReview draft={draft} errors={publicationErrors} active={active} audience={audience} /> : null}
    </Card><aside className="exam-studio__rail"><Card className="p-5"><h2 className="exam-studio__summary-title">Resumo da prova</h2><dl><div><dt>Questões</dt><dd>{draft.questions.length}</dd></div><div><dt>Pontuação</dt><dd>{totalWeight.toLocaleString("pt-BR")}</dd></div><div><dt>Para quem</dt><dd>{draft.audienceLabel || "Não definido"}</dd></div><div><dt>Disciplina</dt><dd>{draft.subject || "Não definida"}</dd></div></dl>{publicationErrors.length ? <div className="exam-studio__pending"><CircleAlert className="size-4" /><span>{publicationErrors.length} {publicationErrors.length === 1 ? "ajuste" : "ajustes"} antes de publicar</span></div> : <div className="exam-studio__ready"><Check className="size-4" /><span>Pronta para publicar</span></div>}</Card>{active?.originalFileName ? <Card className="p-5"><p className="teacher-exams__eyebrow">ARQUIVO ORIGINAL</p><p className="mt-3 truncate font-semibold">{active.originalFileName}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Armazenado de forma privada · {active.originalFileSize ? `${(active.originalFileSize / 1024 / 1024).toFixed(1)} MB` : ""}</p><Button asChild variant="secondary" className="mt-4 w-full"><a href={`/api/teacher-exams/${active.id}/original-file`} target="_blank" rel="noreferrer"><Download className="size-4" />Abrir original</a></Button></Card> : null}</aside></div>
    {!readOnly ? <footer className="exam-studio__actions"><Button variant="secondary" disabled={busy} loading={busy} onClick={() => void onSave("rascunho")}><Save className="size-4" />Salvar rascunho</Button><Button disabled={busy} loading={busy} onClick={() => void onSave("publicar")}><BookOpenCheck className="size-4" />Publicar prova</Button></footer> : null}</div>;
}

function BasicInformation({ draft, readOnly, setDraft }: { draft: TeacherExamInput; readOnly: boolean; setDraft: React.Dispatch<React.SetStateAction<TeacherExamInput>> }) {
  const set = (changes: Partial<TeacherExamInput>) => setDraft((current) => ({ ...current, ...changes }));
  const typeSubject = (value: string) => set({
    assignmentGroups: [],
    subject: value,
    // Digitar aqui nunca cadastra nem vincula uma disciplina institucional.
    subjectId: null,
  });
  const updateYear = (value: string) => set({
    assignmentGroups: [],
    audienceId: value.trim() ? `ANO-${normalizeYearSegment(value)}-GERAL` : "",
    audienceLabel: value.trim() ? wholeYearLabel(normalizeYearSegment(value)) : "",
    groupType: "GERAL",
    yearSegment: value.trim() ? normalizeYearSegment(value) : "",
  });
  const yearInput = draft.audienceLabel.startsWith("Todo o ") ? draft.audienceLabel.slice("Todo o ".length) : draft.yearSegment;

  return <section><SectionHeading eyebrow="ETAPA 1" title="Sobre esta prova" detail="Você decide o que preencher agora. Os campos abaixo não bloqueiam a criação da prova." /><div className="exam-form"><label className="sm:col-span-2">Nome da prova <small>Opcional — você pode escolher um nome depois.</small><Input disabled={readOnly} value={draft.title} onChange={(event) => set({ title: event.target.value })} placeholder="Ex.: Avaliação do 2º ano" /></label><label>Disciplina <small>Opcional — escreva do seu jeito.</small><Input disabled={readOnly} value={draft.subject} onChange={(event) => typeSubject(event.target.value)} placeholder="Ex.: Língua Portuguesa" /></label><label>Para qual ano? <small>Opcional — ao informar, vale para todas as turmas desse ano.</small><Input disabled={readOnly} value={yearInput} onChange={(event) => updateYear(event.target.value)} placeholder="Ex.: 2º ano" /></label><details className="exam-form__optional sm:col-span-2"><summary>Adicionar mais detalhes, se quiser</summary><div><label>Bimestre ou trimestre<Input disabled={readOnly} value={draft.period} onChange={(event) => set({ period: event.target.value })} placeholder="Ex.: 1º bimestre" /></label><label>Data prevista<Input disabled={readOnly} type="date" value={draft.examDate} onChange={(event) => set({ examDate: event.target.value })} /></label><label>Tempo estimado (minutos)<Input disabled={readOnly} type="number" min={1} max={600} value={draft.estimatedDuration ?? ""} onChange={(event) => set({ estimatedDuration: event.target.value ? Number(event.target.value) : null })} /></label><label className="sm:col-span-2">Descrição<Textarea disabled={readOnly} value={draft.description} onChange={(event) => set({ description: event.target.value })} placeholder="Uma anotação para sua organização" /></label><label className="sm:col-span-2">Instruções para os alunos<Textarea disabled={readOnly} value={draft.instructions} onChange={(event) => set({ instructions: event.target.value })} placeholder="Leia com atenção e marque apenas uma alternativa…" /></label></div></details></div></section>;
}

function QuestionEditor({ index, question, total, readOnly, onChange, onDelete, onDuplicate, onMove, onDragStart, onDrop }: { index: number; question: TeacherExamInput["questions"][number]; total: number; readOnly: boolean; onChange: (changes: Partial<TeacherExamInput["questions"][number]>) => void; onDelete: () => void; onDuplicate: () => void; onMove: (direction: -1 | 1) => void; onDragStart: () => void; onDrop: () => void }) {
  const objective = question.type === "multipla_escolha" || question.type === "verdadeiro_falso";
  return <article className={`question-editor question-block ${question.needsReview ? "question-editor--review" : ""}`} draggable={!readOnly} onDragStart={onDragStart} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><header><span className="question-editor__grip" title="Arraste para reorganizar"><GripVertical className="size-4" /></span><strong>Questão {index + 1}</strong>{question.needsReview ? <Badge tone="warning">Revisar</Badge> : null}<div className="ml-auto flex gap-1"><button type="button" disabled={readOnly || index === 0} onClick={() => onMove(-1)} aria-label={`Mover questão ${index + 1} para cima`}><ArrowUp className="size-4" /></button><button type="button" disabled={readOnly || index === total - 1} onClick={() => onMove(1)} aria-label={`Mover questão ${index + 1} para baixo`}><ArrowDown className="size-4" /></button><button type="button" disabled={readOnly} onClick={onDuplicate} aria-label={`Duplicar questão ${index + 1}`}><Copy className="size-4" /></button><button type="button" disabled={readOnly || total === 1} onClick={onDelete} aria-label={`Excluir questão ${index + 1}`}><Trash2 className="size-4" /></button></div></header><div className="grid gap-3 p-4 sm:grid-cols-[220px_1fr]"><label>Tipo<Select disabled={readOnly} value={question.type} onChange={(event) => { const type = event.target.value as ExamQuestionType; onChange({ type, alternatives: type === "verdadeiro_falso" ? ["Verdadeiro", "Falso"] : type === "multipla_escolha" && question.alternatives.length < 2 ? ["", "", "", ""] : type === "multipla_escolha" ? question.alternatives : [], correctAnswers: [], correctionCriteria: type === "discursiva" || type === "resposta_curta" ? question.correctionCriteria : "", needsReview: false }); }}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label><label>Enunciado<Textarea disabled={readOnly} value={question.prompt} onChange={(event) => onChange({ prompt: event.target.value, needsReview: false })} placeholder="Digite o enunciado completo" /></label></div>{objective ? <div className="question-editor__alternatives">{question.alternatives.map((alternative, alternativeIndex) => <label key={alternativeIndex}><span>{String.fromCharCode(65 + alternativeIndex)}</span><Input disabled={readOnly || question.type === "verdadeiro_falso"} value={alternative} onChange={(event) => onChange({ alternatives: question.alternatives.map((item, itemIndex) => itemIndex === alternativeIndex ? event.target.value : item), needsReview: false })} placeholder={`Alternativa ${String.fromCharCode(65 + alternativeIndex)}`} />{question.type === "multipla_escolha" && question.alternatives.length > 2 && !readOnly ? <button type="button" onClick={() => onChange({ alternatives: question.alternatives.filter((_, itemIndex) => itemIndex !== alternativeIndex), correctAnswers: question.correctAnswers.filter((answer) => answer !== alternative) })} aria-label={`Remover alternativa ${String.fromCharCode(65 + alternativeIndex)}`}><X className="size-4" /></button> : null}</label>)}{question.type === "multipla_escolha" && !readOnly ? <button type="button" className="question-editor__add-alternative" disabled={question.alternatives.length >= 8} onClick={() => onChange({ alternatives: [...question.alternatives, ""] })}><Plus className="size-4" />Adicionar alternativa</button> : null}</div> : <div className="px-4 pb-4"><label>Critério de correção<Textarea disabled={readOnly} value={question.correctionCriteria} onChange={(event) => onChange({ correctionCriteria: event.target.value, needsReview: false })} placeholder="Explique o que deve aparecer na resposta para receber a pontuação" /></label></div>}</article>;
}

function AnswerKeyEditor({ draft, readOnly, setDraft, updateQuestion, totalWeight }: { draft: TeacherExamInput; readOnly: boolean; setDraft: React.Dispatch<React.SetStateAction<TeacherExamInput>>; updateQuestion: (index: number, changes: Partial<TeacherExamInput["questions"][number]>) => void; totalWeight: number }) {
  const [sequence, setSequence] = useState("");
  const [sequenceMessage, setSequenceMessage] = useState("");
  const objectiveCount = draft.questions.filter((question) => (question.type === "multipla_escolha" || question.type === "verdadeiro_falso") && !question.annulled).length;
  const sequenceAnswers = sequence.toLocaleUpperCase("pt-BR").match(/[A-H]/g) ?? [];
  const applySequence = () => {
    let cursor = 0;
    let applied = 0;
    let unavailable = 0;
    setDraft((current) => ({ ...current, questions: current.questions.map((question) => {
      const objective = question.type === "multipla_escolha" || question.type === "verdadeiro_falso";
      if (!objective || question.annulled || cursor >= sequenceAnswers.length) return question;
      const letter = sequenceAnswers[cursor++];
      const alternative = question.alternatives[letter.charCodeAt(0) - 65];
      if (!alternative?.trim()) { unavailable += 1; return question; }
      applied += 1;
      return { ...question, correctAnswers: [alternative], needsReview: false };
    }) }));
    setSequenceMessage(`${applied} ${applied === 1 ? "resposta aplicada" : "respostas aplicadas"}${unavailable ? ` · ${unavailable} aguardam alternativas preenchidas` : ""}.`);
  };
  const answeredCount = draft.questions.filter((question) => (question.type === "multipla_escolha" || question.type === "verdadeiro_falso") && (question.annulled || question.correctAnswers.length)).length;
  return <section><SectionHeading eyebrow="ETAPA 3" title="Preencha o gabarito" detail="Cole as letras de uma vez. Depois, só confira os itens que ficaram pendentes." /><div className="answer-key-summary"><span><strong>{answeredCount}</strong> respondidas</span><span><strong>{Math.max(0, objectiveCount - answeredCount)}</strong> faltam conferir</span><span><strong>{totalWeight.toLocaleString("pt-BR")}</strong> pontos</span></div>{!readOnly && objectiveCount ? <div className="answer-key-batch"><div><strong>Cole o gabarito de uma vez</strong><span>Ex.: <b>A B C D</b> ou <b>ABCD</b>. Cada letra segue a ordem das questões.</span></div><label><span className="sr-only">Sequência de respostas corretas</span><Textarea rows={2} value={sequence} onChange={(event) => { setSequence(event.target.value); setSequenceMessage(""); }} placeholder="A B C D A B..." /></label><div><span>{sequenceAnswers.length} {sequenceAnswers.length === 1 ? "resposta pronta para aplicar" : "respostas prontas para aplicar"}</span><Button variant="secondary" disabled={!sequenceAnswers.length} onClick={applySequence}><Check className="size-4" />Preencher gabarito</Button></div>{sequenceMessage ? <p role="status" aria-live="polite">{sequenceMessage}</p> : null}</div> : null}<div className="answer-key-list">{draft.questions.map((question, index) => { const objective = question.type === "multipla_escolha" || question.type === "verdadeiro_falso"; return <article key={question.id ?? index} className={`answer-key-row ${question.correctAnswers.length || question.annulled ? "is-complete" : ""}`}><div><strong>Questão {index + 1}</strong><span>{objective ? question.prompt || "Enunciado ainda não preenchido" : "Resposta por critério"}</span></div>{objective ? <div className="answer-key-row__choices" role="group" aria-label={`Resposta correta da questão ${index + 1}`}>{question.alternatives.map((alternative, alternativeIndex) => <button key={`${alternative}-${alternativeIndex}`} type="button" disabled={readOnly || question.annulled || !alternative.trim()} aria-pressed={question.correctAnswers[0] === alternative} className={question.correctAnswers[0] === alternative ? "is-selected" : ""} onClick={() => updateQuestion(index, { correctAnswers: [alternative], needsReview: false })}>{String.fromCharCode(65 + alternativeIndex)}</button>)}{!question.alternatives.some((alternative) => alternative.trim()) ? <span>Volte em Questões e escreva as alternativas.</span> : null}</div> : <span className="answer-key-row__manual">Esta resposta será avaliada pelo critério que você definiu.</span>}<details className="answer-key-row__options"><summary>Opções</summary><div><label>Valor<Input disabled={readOnly} type="number" min={0} step="0.1" value={question.weight} onChange={(event) => updateQuestion(index, { weight: Number(event.target.value) })} /></label><Checkbox disabled={readOnly} checked={question.annulled} label="Anular questão" onChange={(event) => updateQuestion(index, { annulled: event.target.checked, correctAnswers: event.target.checked ? [] : question.correctAnswers })} /></div></details></article>; })}</div></section>;
}

function ApplicationEditor({ audience, draft, loading, readOnly, setDraft, viewerId }: { audience: ExamAudience; draft: TeacherExamInput; loading: boolean; readOnly: boolean; setDraft: React.Dispatch<React.SetStateAction<TeacherExamInput>>; viewerId: string }) {
  const groups = draft.assignmentGroups ?? [];
  const hasSubject = Boolean(draft.subjectId);
  const change = (teacherId: string, classId: string, checked: boolean) => setDraft((current) => {
    const currentGroups = current.assignmentGroups ?? [];
    const group = currentGroups.find((item) => item.teacherId === teacherId);
    const classIds = checked ? [...new Set([...(group?.classIds ?? []), classId])] : (group?.classIds ?? []).filter((item) => item !== classId);
    const next = [...currentGroups.filter((item) => item.teacherId !== teacherId), ...(classIds.length ? [{ teacherId, classIds }] : [])];
    const primary = audience.classes.find((item) => next.some((entry) => entry.classIds.includes(item.id)));
    return { ...current, assignmentGroups: next, audienceId: primary?.id ?? "", audienceLabel: primary?.name ?? "" };
  });
  const useWholeYear = () => setDraft((current) => ({ ...current, assignmentGroups: [], audienceId: current.yearSegment.trim() ? `ANO-${current.yearSegment.trim()}-GERAL` : "", audienceLabel: current.yearSegment.trim() ? wholeYearLabel(current.yearSegment.trim()) : "", groupType: "GERAL" }));
  return <section><SectionHeading eyebrow="ETAPA 4" title="Para quem é esta prova?" detail="Se você informou uma série ou ano, ela já vale para todo esse ano. Esta etapa é opcional." />
    <div className="application-choice"><div><strong>{draft.audienceLabel || "Sem público definido"}</strong><span>{draft.yearSegment.trim() ? "A prova pode ser usada por todas as turmas desse ano." : "Você pode definir isso depois, sem impedir a publicação."}</span></div>{draft.yearSegment.trim() ? <Button variant="secondary" disabled={readOnly} onClick={useWholeYear}><Check className="size-4" />Usar {wholeYearLabel(draft.yearSegment.trim()).toLocaleLowerCase("pt-BR")}</Button> : null}</div>
    {hasSubject ? <details className="application-advanced"><summary>Definir responsáveis e turmas cadastradas</summary>{loading ? <p>Carregando opções disponíveis…</p> : !audience.teachers.length ? <p>Nenhuma opção de turma está disponível para esta disciplina.</p> : <div className="application-groups">{audience.teachers.map((teacher) => <article className="application-group" key={teacher.id}><header><strong>{teacher.id === viewerId ? "Você" : teacher.name}</strong><span>{teacher.id === viewerId ? "Vai aplicar a prova" : "Pode aplicar esta prova"}</span></header><div>{teacher.classIds.map((classId) => { const classroom = audience.classes.find((item) => item.id === classId); if (!classroom) return null; const selected = groups.some((group) => group.teacherId === teacher.id && group.classIds.includes(classId)); return <Checkbox key={classId} disabled={readOnly} checked={selected} label={classroom.name} onChange={(event) => change(teacher.id, classId, event.target.checked)} />; })}</div></article>)}</div>}</details> : null}
  </section>;
}

function ExamReview({ draft, errors, active, audience }: { draft: TeacherExamInput; errors: string[]; active: TeacherExam | null; audience: ExamAudience }) {
  const assignmentText = (draft.assignmentGroups ?? []).flatMap((group) => group.classIds.map((classId) => `${audience.teachers.find((teacher) => teacher.id === group.teacherId)?.name ?? "Professor"} · ${audience.classes.find((item) => item.id === classId)?.name ?? "Turma"}`));
  return <section><SectionHeading eyebrow="ETAPA 5" title="Revise e publique" detail="Conferimos sua conta e o conteúdo da prova antes de salvar." />{errors.length ? <div className="publish-checklist review-errors"><CircleAlert className="size-5" /><div><strong>Falta pouco</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div></div> : <div className="publish-checklist review-success"><Check className="size-5" /><div><strong>Pronta para publicar</strong><p>A prova ficará disponível para impressão, cartão-resposta e correção.</p></div></div>}<article className="exam-preview"><header><div><p>PROVASCAN · PRÉ-VISUALIZAÇÃO</p><h2>{draft.title || "Prova sem título"}</h2><span>{draft.subject || "Sem disciplina"} · {formatDate(draft.examDate)}</span></div><span>{draft.questions.length} questões</span></header>{assignmentText.length ? <aside><strong>Aplicação</strong><p>{assignmentText.join(" · ")}</p></aside> : draft.audienceLabel ? <aside><strong>Aplicação</strong><p>{draft.audienceLabel}</p></aside> : null}{draft.instructions ? <aside><strong>Instruções</strong><p>{draft.instructions}</p></aside> : null}<ol>{draft.questions.map((question, index) => <li key={question.id ?? index}><strong>{index + 1}.</strong><div><p>{question.prompt || "Enunciado pendente"}</p>{question.alternatives.map((alternative, alternativeIndex) => <span key={alternativeIndex}>{String.fromCharCode(65 + alternativeIndex)}) {alternative || "Alternativa pendente"}</span>)}</div></li>)}</ol></article>{active ? <div className="mt-5"><PrintStudio exam={active} /></div> : null}</section>;
}

function SectionHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) { return <header className="section-heading"><p>{eyebrow}</p><h2>{title}</h2><span>{detail}</span></header>; }

function ExamRow({ exam, busy, readOnly, onAction, onEdit, onMessage }: { exam: TeacherExam; busy: boolean; readOnly: boolean; onAction: (exam: TeacherExam, action: "duplicar" | "arquivar" | "restaurar" | "excluir") => Promise<void>; onEdit: () => void; onMessage: (message: string) => void }) {
  const [menu, setMenu] = useState(false);
  const originIcon = exam.sourceType === "pdf" || exam.sourceType === "doc" || exam.sourceType === "docx" ? <FileText className="size-5" /> : exam.sourceType === "imagem" ? <ImageIcon className="size-5" /> : <Pencil className="size-5" />;
  return <Card className={`exam-card ${exam.status === "arquivada" ? "is-archived" : ""} ${menu ? "has-open-menu" : ""}`}>
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
