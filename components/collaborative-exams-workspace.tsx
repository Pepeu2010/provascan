"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, ClipboardCheck, Printer, RotateCcw, Send, ShieldCheck, Trash2 } from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { validateCollaborativeExamDraft } from "@/lib/collaborative-exam-draft";
import { canManageAcademicExams } from "@/lib/collaborative-access";
import { compareClassrooms } from "@/lib/education-labels";
import { buildOrderedAnswerKey, sortStudentsForPrinting } from "@/services/collaborative-printing";
import type { CollaborativeExam, ExamSectionStatus } from "@/types/collaborative-exams";
import type { Student } from "@/types/domain";

type Teacher = { id: string; name: string };
type DraftSection = { subject: string; teacherId: string; questionCount: string };
const statusTone: Record<ExamSectionStatus, "neutral" | "warning" | "success" | "error"> = { rascunho: "neutral", enviado: "warning", aprovado: "success", devolvido: "error" };
const statusLabel: Record<ExamSectionStatus, string> = { rascunho: "Rascunho", enviado: "Em conferência", aprovado: "Aprovado", devolvido: "Devolvido" };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "A operação não pôde ser concluída.");
  return body;
}

function escapeForHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function printAnswerKey(exam: CollaborativeExam) {
  const sections = [...exam.sections].sort((left, right) => left.questionStart - right.questionStart);
  const answers = buildOrderedAnswerKey(sections);
  const answerRows = answers.map((item) => `<div class="answer"><span>${item.question}</span><strong>${escapeForHtml(item.answer || "—")}</strong></div>`).join("");
  const sectionRows = sections.map((section) => `<li><strong>${escapeForHtml(section.subject)}</strong><span>Questões ${section.questionStart}–${section.questionEnd}</span></li>`).join("");
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Gabarito — ${escapeForHtml(exam.title)}</title><style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; } body { min-width: 210mm; margin: 0; padding: 12mm 0; background: #e9edf4; color: #172033; font-family: Arial, Helvetica, sans-serif; } .print-sheet { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 20mm 17mm; background: #fff; box-shadow: 0 14px 38px rgb(26 37 56 / 18%); }
    header { border-bottom: 3px solid #5538c8; padding-bottom: 15px; } .eyebrow { color: #5538c8; font-size: 10px; font-weight: 800; letter-spacing: .14em; } h1 { margin: 6px 0; font-size: 25px; } .meta { color: #526075; font-size: 12px; }
    .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; } .summary div { border: 1px solid #d5dbea; border-radius: 10px; padding: 11px; } .summary b { display: block; color: #526075; font-size: 9px; letter-spacing: .1em; } .summary span { display: block; margin-top: 4px; font-size: 13px; font-weight: 700; }
    h2 { margin: 30px 0 15px; font-size: 13px; text-align: center; text-transform: uppercase; letter-spacing: .1em; } .answers { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; width: 170mm; max-width: 100%; margin: 0 auto; padding: 15mm; border: 1.5px solid #c5d0e0; border-radius: 18px; background: #f8faff; } .answer { display: grid; min-height: 31mm; place-items: center; gap: 7px; border: 1.5px solid #bdc9dc; border-radius: 12px; padding: 12px; background: #fff; break-inside: avoid; } .answer span { color: #667085; font-size: 12px; font-weight: 700; } .answer strong { color: #5538c8; font-size: 30px; }
    ul { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 0; list-style: none; } li { border-left: 3px solid #a78bfa; background: #f7f5ff; padding: 9px 11px; } li strong, li span { display: block; } li span { margin-top: 3px; color: #526075; font-size: 11px; }
    footer { margin-top: 24px; border-top: 1px solid #d5dbea; padding-top: 10px; color: #667085; font-size: 10px; } @media print { body { padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .print-sheet { box-shadow: none; } }
  </style></head><body><div class="print-sheet"><header><div class="eyebrow">PROVASCAN · GABARITO FINAL</div><h1>${escapeForHtml(exam.title)}</h1><div class="meta">${escapeForHtml(exam.audienceLabel)} · ${escapeForHtml(exam.examDate)} · ${exam.questionCount} questões</div></header><div class="summary"><div><b>ORDEM DE IMPRESSÃO</b><span>Questões 1 a ${exam.questionCount}</span></div><div><b>SITUAÇÃO</b><span>Gabarito liberado</span></div></div><h2>Respostas em ordem numérica</h2><main class="answers">${answerRows}</main><h2>Blocos da prova</h2><ul>${sectionRows}</ul><footer>Gerado pelo ProvaScan. Confira este documento antes de distribuir aos aplicadores.</footer></div></body></html>`;
  const printWindow = window.open("", "_blank", "width=900,height=720");
  if (!printWindow) return false;
  printWindow.opener = null;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.addEventListener("load", () => window.requestAnimationFrame(() => { printWindow.focus(); printWindow.print(); }), { once: true });
  printWindow.document.close();
  return true;
}

function printStudentCards(exam: CollaborativeExam, students: Student[], classNames: Map<string, string>) {
  // Open first, while this click is still trusted by the browser. Previously the
  // entire document was assembled before opening the tab, which could make a
  // large class feel unresponsive and occasionally be interpreted as a popup.
  const printWindow = window.open("", "_blank", "width=900,height=720");
  if (!printWindow) return false;
  printWindow.opener = null;

  const questionRows = Array.from({ length: exam.questionCount }, (_, index) => `<div class="question"><b>${index + 1}</b>${exam.alternatives.map((alternative) => `<span>${escapeForHtml(alternative)}</span><i aria-hidden="true"></i>`).join("")}</div>`).join("");
  const cards = students.map((student) => `<section class="card"><header><div><b>PROVASCAN · CARTÃO-RESPOSTA</b><h1>${escapeForHtml(exam.title)}</h1><p>${escapeForHtml(classNames.get(student.turma) ?? exam.audienceLabel)} · ${escapeForHtml(exam.examDate)}</p></div><div class="student"><small>ALUNO(A)</small><strong>${escapeForHtml(student.nome)}</strong></div></header><p class="instruction">Preencha somente uma alternativa por questão.</p><main class="answer-space">${questionRows}</main><footer>Não dobre este cartão. Use caneta azul ou preta.</footer></section>`).join("");
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Cartões — ${escapeForHtml(exam.title)}</title><style>@page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{min-width:210mm;margin:0;padding:12mm 0;background:#e9edf4;color:#172033;font-family:Arial,Helvetica,sans-serif}.card{width:210mm;min-height:297mm;margin:0 auto 12mm;padding:20mm 17mm;background:#fff;box-shadow:0 14px 38px rgb(26 37 56 / 18%);break-after:page;page-break-after:always}.card:last-child{margin-bottom:0;break-after:auto;page-break-after:auto}header{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid #5538c8;padding-bottom:12px}header b{color:#5538c8;font-size:10px;letter-spacing:.1em}h1{margin:6px 0;font-size:22px}p{margin:0;color:#526075;font-size:12px}.student{min-width:180px;border-left:1px solid #d5dbea;padding-left:14px}.student small{display:block;color:#667085;font-size:9px;letter-spacing:.1em}.student strong{display:block;margin-top:5px;font-size:14px}.instruction{margin:21px 0 0;text-align:center}.answer-space{display:flex;width:170mm;max-width:100%;min-height:172mm;flex-direction:column;justify-content:center;margin:14mm auto 0;padding:16mm 15mm;border:1.5px solid #c5d0e0;border-radius:18px;background:#f8faff}.question{display:grid;grid-template-columns:46px repeat(${exam.alternatives.length},30px 34px);align-items:center;justify-content:center;gap:10px;min-height:12.5mm;border-bottom:1px solid #dce4ef;font-size:12px}.question:last-child{border-bottom:0}.question b{font-size:16px}.question span{text-align:center;font-weight:700}.question i{width:26px;height:26px;border:2px solid #172033;border-radius:50%}footer{margin-top:18px;color:#667085;font-size:10px;text-align:center}@media print{body{padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.card{margin:0;box-shadow:none}}</style></head><body>${cards}</body></html>`;
  printWindow.document.open();
  printWindow.document.write(html);
  const requestPrint = () => {
    printWindow.focus();
    printWindow.print();
  };
  printWindow.addEventListener("load", () => window.requestAnimationFrame(requestPrint), { once: true });
  printWindow.document.close();
  return true;
}

export function CollaborativeExamsWorkspace() {
  const { data, session } = useAppData();
  const management = canManageAcademicExams(session?.role ?? "professor");
  const [exams, setExams] = useState<CollaborativeExam[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [audienceId, setAudienceId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [alternatives, setAlternatives] = useState("A,B,C,D,E");
  const [sections, setSections] = useState<DraftSection[]>([]);
  const [examToDelete, setExamToDelete] = useState<CollaborativeExam | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      if (management) {
        const result = await api<{ exams: CollaborativeExam[]; teachers: Teacher[] }>("/api/collaborative-exams");
        setExams(result.exams); setTeachers(result.teachers);
      } else {
        const result = await api<{ exams: CollaborativeExam[] }>("/api/my-exams");
        setExams(result.exams);
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível carregar as provas."); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // The data source intentionally changes with the authenticated role.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, management]);
  const total = useMemo(() => sections.reduce((sum, item) => sum + (Number(item.questionCount) || 0), 0), [sections]);
  const audience = data.classes.find((item) => item.id === audienceId);

  const create = async () => {
    if (isCreating) return;
    const parsedAlternatives = alternatives.split(",").map((item) => item.trim()).filter(Boolean);
    const validationMessage = validateCollaborativeExamDraft({ alternatives: parsedAlternatives, date, sections, title });
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setIsCreating(true);
    setMessage("");
    try {
      await api("/api/collaborative-exams", { method: "POST", body: JSON.stringify({ title: title.trim(), audienceId: audience?.id || "geral", audienceLabel: audience?.nome || "Aplicação geral", groupType: audience?.groupType || "GERAL", yearSegment: audience?.yearSegment || "OUTROS", alternatives: parsedAlternatives, examDate: date, sections: sections.map((item) => ({ subject: item.subject.trim(), teacherId: item.teacherId, questionCount: Number(item.questionCount) })) }) });
      setMessage("Prova-base criada e distribuída aos professores.");
      setTitle("");
      setSections([]);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar a prova.");
    } finally {
      setIsCreating(false);
    }
  };
  const removeExam = async () => {
    if (!examToDelete) return;
    setDeleting(true);
    try {
      const result = await api<{ message: string }>(`/api/collaborative-exams/${examToDelete.id}`, { method: "DELETE" });
      setMessage(result.message);
      setExamToDelete(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível excluir a prova.");
    } finally {
      setDeleting(false);
    }
  };
  if (!session || loading) return <CollaborativeExamsLoading />;

  return <div className="grid gap-5">
    <Card className="collaborative-exams__intro p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h2 className="text-2xl font-semibold text-[var(--foreground)]">{management ? "Provas colaborativas" : "Minhas provas"}</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">{management ? "Monte a prova-base, distribua os blocos e só libere a operação quando todos forem aprovados." : "Preencha apenas as questões atribuídas a você e envie o bloco para conferência."}</p></div><Badge tone={management ? "accent" : "neutral"}>{management ? "Gestão acadêmica" : "Acesso do professor"}</Badge></div>
      {management ? (
        <div className="mt-6 grid gap-4" aria-busy={isCreating}>
          <div className="grid gap-3 md:grid-cols-2">
            <Input disabled={isCreating} placeholder="Título da prova" value={title} onChange={(event) => setTitle(event.target.value)} />
            <Select disabled={isCreating} value={audienceId} onChange={(event) => setAudienceId(event.target.value)}><option value="">Aplicação geral</option>{data.classes.slice().sort(compareClassrooms).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select>
            <Input disabled={isCreating} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            <Input disabled={isCreating} placeholder="Alternativas: A,B,C,D,E" value={alternatives} onChange={(event) => setAlternatives(event.target.value)} />
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2"><div><h3 className="font-semibold text-[var(--foreground)]">Professores responsáveis</h3><p className="mt-1 text-sm text-[var(--muted-foreground)]">Marque todos os professores que receberão um bloco próprio nesta prova.</p></div><Badge tone="accent">{sections.length} selecionado{sections.length === 1 ? "" : "s"}</Badge></div>
            <div className="mt-4 max-h-64 divide-y divide-[var(--border)] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card-solid)] pr-1" aria-label="Lista de professores disponíveis">
              {teachers.map((teacher) => <Checkbox key={teacher.id} checked={sections.some((section) => section.teacherId === teacher.id)} disabled={isCreating} label={teacher.name} wrapperClassName="flex w-full px-3 py-3 hover:bg-[var(--surface)]" onChange={(event) => setSections((current) => event.target.checked ? [...current, { subject: "", teacherId: teacher.id, questionCount: "10" }] : current.filter((section) => section.teacherId !== teacher.id))} />)}
              {!teachers.length ? <p className="px-3 py-4 text-sm text-[var(--muted-foreground)]">Nenhum professor ativo foi encontrado.</p> : null}
            </div>
          </div>
          {sections.length ? <div className="grid gap-3">{sections.map((item) => <div key={item.teacherId} className="grid gap-3 rounded-2xl border border-[var(--border)] p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_auto]"><p className="flex min-h-11 items-center text-sm font-semibold text-[var(--foreground)]">{teachers.find((teacher) => teacher.id === item.teacherId)?.name ?? "Professor selecionado"}</p><Input disabled={isCreating} placeholder="Matéria" value={item.subject} onChange={(event) => setSections((current) => current.map((value) => value.teacherId === item.teacherId ? { ...value, subject: event.target.value } : value))} /><Input disabled={isCreating} type="number" min="1" max="200" placeholder="Questões" value={item.questionCount} onChange={(event) => setSections((current) => current.map((value) => value.teacherId === item.teacherId ? { ...value, questionCount: event.target.value } : value))} /><Button variant="secondary" disabled={isCreating} onClick={() => setSections((current) => current.filter((value) => value.teacherId !== item.teacherId))}>Remover</Button></div>)}</div> : null}
          <div className="flex flex-wrap items-center gap-3"><Button loading={isCreating} onClick={() => void create()} disabled={isCreating}><ClipboardCheck className="size-4" />{isCreating ? "Criando prova-base…" : "Criar prova-base"}</Button><Badge tone="accent">{total} questões globais</Badge></div>
        </div>
      ) : null}
      {message ? <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
    </Card>
    {exams.length ? exams.map((exam) => <ExamCard key={exam.id} exam={exam} management={management} onChange={load} onDelete={() => setExamToDelete(exam)} />) : <Card className="p-6"><p className="text-sm text-[var(--muted-foreground)]">{management ? "Nenhuma prova-base criada." : "Nenhum bloco de prova foi atribuído a você."}</p></Card>}
    <DeleteExamDialog exam={examToDelete} deleting={deleting} onCancel={() => !deleting && setExamToDelete(null)} onConfirm={() => void removeExam()} />
  </div>;
}

function CollaborativeExamsLoading() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-live="polite">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-7 w-52 animate-pulse rounded-full bg-[var(--surface-strong)]" />
            <div className="h-4 max-w-2xl animate-pulse rounded-full bg-[var(--surface-strong)]" />
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-[var(--surface-strong)]" />
          </div>
          <div className="h-7 w-28 animate-pulse rounded-full bg-[var(--surface-strong)]" />
        </div>
        <p className="mt-6 text-sm text-[var(--muted-foreground)]">Carregando distribuição de provas…</p>
      </Card>
      <Card className="p-6">
        <div className="space-y-3">
          <div className="h-5 w-40 animate-pulse rounded-full bg-[var(--surface-strong)]" />
          <div className="h-16 animate-pulse rounded-[18px] bg-[var(--surface-strong)]" />
        </div>
      </Card>
    </div>
  );
}

function ExamCard({ exam, management, onChange, onDelete }: { exam: CollaborativeExam; management: boolean; onChange: () => Promise<void>; onDelete: () => void }) {
  const [message, setMessage] = useState("");
  const [isReleasing, setIsReleasing] = useState(false);
  const release = async () => {
    if (isReleasing) return;
    setIsReleasing(true);
    try {
      await api(`/api/collaborative-exams/${exam.id}/release`, { method: "POST", body: "{}" });
      setMessage("Prova liberada para impressão e correção.");
      await onChange();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível liberar.");
    } finally {
      setIsReleasing(false);
    }
  };
  const complete = exam.sections.every((item) => item.status === "aprovado");
  return <Card className="p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[var(--accent)]">AVALIAÇÃO · {exam.releasedAt ? "LIBERADA" : "EM PREPARO"}</p><h3 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)]">{exam.title}</h3><p className="mt-2 text-sm text-[var(--muted-foreground)]">{exam.audienceLabel} · {exam.questionCount} questões · {exam.examDate}</p></div>{management ? <div className="flex flex-wrap items-center gap-2">{exam.releasedAt ? <><Badge tone="success">Liberada</Badge><Button variant="secondary" onClick={() => setMessage(printAnswerKey(exam) ? "Gabarito em ordem aberto para impressão ou PDF." : "Não foi possível abrir a janela de impressão.")}><Printer className="size-4" />Imprimir gabarito em ordem</Button></> : <Button loading={isReleasing} disabled={!complete || isReleasing} onClick={() => void release()}><ShieldCheck className="size-4" />Liberar prova</Button>}<Button variant="danger" onClick={onDelete}><Trash2 className="size-4" />Excluir prova</Button></div> : exam.releasedAt ? <Badge tone="success">Liberada</Badge> : null}</div>{management && exam.releasedAt ? <><ReleaseFlow /><div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><div><AnswerKeyPreview exam={exam} /><div className="mt-5 grid gap-3">{exam.sections.map((section) => <ManagementSection key={section.id} exam={exam} section={section} onChange={onChange} />)}</div></div><PrintOperations exam={exam} onMessage={setMessage} /></div></> : <div className="mt-5 grid gap-3">{exam.sections.map((section) => management ? <ManagementSection key={section.id} exam={exam} section={section} onChange={onChange} /> : <TeacherSection key={section.id} exam={exam} section={section} onChange={onChange} />)}</div>}{message ? <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--muted-foreground)]">{message}</p> : null}</Card>;
}

function ReleaseFlow() {
  return <div className="mt-6 grid gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-4">{[["1", "Revisar", "Respostas conferidas"], ["2", "Liberar", "Prova disponível"], ["3", "Imprimir", "Gabarito e cartões"], ["4", "Corrigir", "Leitura e resultado"]].map(([step, title, detail], index) => <div key={step} className="flex items-center gap-3"><span className={`grid size-8 shrink-0 place-items-center rounded-full border text-xs font-bold ${index < 3 ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]" : "border-[var(--border-strong)] text-[var(--muted-foreground)]"}`}>{step}</span><div><p className="text-sm font-semibold">{title}</p><p className="text-xs text-[var(--muted-foreground)]">{detail}</p></div></div>)}</div>;
}

function AnswerKeyPreview({ exam }: { exam: CollaborativeExam }) {
  const answers = buildOrderedAnswerKey(exam.sections);
  return <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="text-lg font-semibold">Gabarito em ordem</h4><p className="mt-1 text-sm text-[var(--muted-foreground)]">Q1 → Q{exam.questionCount}, bloqueado após a liberação.</p></div><Button variant="secondary" onClick={() => void printAnswerKey(exam)}><Printer className="size-4" />Imprimir</Button></div><div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-10">{answers.map((item) => <div key={item.question} className="rounded-xl border border-[var(--border)] bg-[var(--card-solid)] px-2 py-3 text-center"><span className="block font-mono text-[10px] text-[var(--muted-foreground)]">Q{item.question}</span><strong className="mt-1 block text-lg text-[var(--foreground)]">{item.answer || "—"}</strong></div>)}</div></section>;
}

function PrintOperations({ exam, onMessage }: { exam: CollaborativeExam; onMessage: (message: string) => void }) {
  const { data } = useAppData();
  const students = useMemo(() => sortStudentsForPrinting(data.students, data.classes), [data.classes, data.students]);
  const orderedClasses = useMemo(() => data.classes.slice().sort(compareClassrooms), [data.classes]);
  const [classId, setClassId] = useState("");
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const visibleStudents = students.filter((student) => !classId || student.turma === classId);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => students.map((student) => student.id));
  const selected = visibleStudents.filter((student) => selectedIds.includes(student.id));
  const classNames = new Map(data.classes.map((item) => [item.id, item.nome]));
  const preparePrint = () => {
    if (isPreparingPrint || !selected.length) return;
    setIsPreparingPrint(true);
    const opened = printStudentCards(exam, selected, classNames);
    onMessage(opened ? `${selected.length} cartões estão sendo preparados para impressão.` : "Não foi possível abrir a janela de impressão. Libere pop-ups para este site e tente novamente.");
    window.setTimeout(() => setIsPreparingPrint(false), 700);
  };
  const allVisibleSelected = visibleStudents.length > 0 && selected.length === visibleStudents.length;
  return <aside className="print-operations rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"><div className="print-operations__heading"><div><p className="font-mono text-[10px] font-bold tracking-[0.15em] text-[var(--accent)]">OPERAÇÃO DE IMPRESSÃO</p><h4 className="mt-2 text-lg font-semibold">Gerar cartões de resposta</h4><p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">Escolha a turma, confirme os alunos e gere tudo na ordem certa.</p></div><span className="print-operations__count" aria-label={`${selected.length} alunos selecionados`}>{selected.length}</span></div><div className="mt-5 grid gap-3"><Select aria-label="Filtrar alunos por turma" value={classId} onChange={(event) => { const nextClassId = event.target.value; setClassId(nextClassId); setSelectedIds(students.filter((student) => !nextClassId || student.turma === nextClassId).map((student) => student.id)); }}><option value="">Todas as turmas</option>{orderedClasses.map((classRoom) => <option key={classRoom.id} value={classRoom.id}>{classRoom.nome}</option>)}</Select><Checkbox label="Selecionar todos desta lista" checked={allVisibleSelected} onChange={(event) => setSelectedIds(event.target.checked ? visibleStudents.map((student) => student.id) : [])} wrapperClassName="print-operations__select-all" /><div className="print-operations__students max-h-56 divide-y divide-[var(--border)] overflow-y-auto rounded-xl border border-[var(--border)]">{visibleStudents.map((student) => <Checkbox key={student.id} checked={selectedIds.includes(student.id)} label={student.nome} wrapperClassName="print-operations__student flex w-full px-3 py-2.5" onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))} />)}{!visibleStudents.length ? <p className="px-3 py-4 text-sm text-[var(--muted-foreground)]">Nenhum aluno ativo nesta turma.</p> : null}</div><Button loading={isPreparingPrint} disabled={!selected.length || isPreparingPrint} onClick={preparePrint}><Printer className="size-4" />{isPreparingPrint ? "Preparando cartões…" : `Gerar ${selected.length} ${selected.length === 1 ? "cartão" : "cartões"}`}</Button></div><div className="mt-5 border-t border-[var(--border)] pt-4"><p className="text-sm font-semibold">Pronto para imprimir ou salvar em PDF</p><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">A nova aba abre imediatamente. Com muitos alunos, a montagem continua nela sem travar esta tela.</p></div></aside>;
}

function DeleteExamDialog({ exam, deleting, onCancel, onConfirm }: { exam: CollaborativeExam | null; deleting: boolean; onCancel: () => void; onConfirm: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (exam && !dialog.open) dialog.showModal();
    if (!exam && dialog.open) dialog.close();
  }, [exam]);

  return <dialog ref={dialogRef} className="m-auto w-[min(calc(100vw-32px),520px)] rounded-[24px] border border-[color-mix(in_srgb,var(--error)_42%,var(--border))] bg-[var(--card-solid)] p-0 text-[var(--foreground)] shadow-[0_32px_100px_rgb(0_0_0_/_48%)] backdrop:bg-[var(--overlay-scrim)] backdrop:backdrop-blur-[3px]" aria-labelledby="delete-exam-title" aria-describedby="delete-exam-description" onCancel={(event) => { event.preventDefault(); onCancel(); }} onClick={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); if (!deleting && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) onCancel(); }} onClose={() => { if (exam && !deleting) onCancel(); }}><div className="relative overflow-hidden p-6 sm:p-8"><div className="absolute inset-x-0 top-0 h-1 bg-[var(--error)]" /><div className="grid size-12 place-items-center rounded-2xl border border-[color-mix(in_srgb,var(--error)_35%,var(--border))] bg-[color-mix(in_srgb,var(--error)_12%,var(--surface))] text-[var(--error)]"><AlertTriangle className="size-5" /></div><p className="mt-6 font-mono text-[10px] font-bold tracking-[0.18em] text-[var(--error)]">EXCLUSÃO DEFINITIVA</p><h2 id="delete-exam-title" className="mt-2 text-2xl font-bold tracking-[-0.04em]">Excluir prova para todos?</h2><p id="delete-exam-description" className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">A prova <strong className="text-[var(--foreground)]">{exam?.title}</strong>, seus blocos, gabaritos, regras e correções vinculadas serão removidos para toda a equipe. Esta ação não pode ser desfeita.</p><div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" disabled={deleting} onClick={onCancel}>Cancelar</Button><Button variant="danger" loading={deleting} onClick={onConfirm}><Trash2 className="size-4" />Excluir definitivamente</Button></div></div></dialog>;
}

function ManagementSection({ exam, section, onChange }: { exam: CollaborativeExam; section: CollaborativeExam["sections"][number]; onChange: () => Promise<void> }) {
  const [note, setNote] = useState(section.reviewNote); const [message, setMessage] = useState(""); const [isReviewing, setIsReviewing] = useState(false);
  const review = async (approved: boolean) => {
    if (isReviewing) return;
    setIsReviewing(true);
    try {
      const body = await api<{ message: string }>(`/api/collaborative-exams/${exam.id}/sections/${section.id}/review`, { method: "POST", body: JSON.stringify({ approved, note }) });
      setMessage(body.message);
      await onChange();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível revisar.");
    } finally {
      setIsReviewing(false);
    }
  };
  return <div className="rounded-2xl border border-[var(--border)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-[var(--foreground)]">{section.subject} · Q{section.questionStart}–{section.questionEnd}</p><Badge tone={statusTone[section.status]}>{statusLabel[section.status]}</Badge></div><p className="mt-1 text-sm text-[var(--muted-foreground)]">Responsável: {section.teacherName}</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6" aria-label={`Gabarito de ${section.subject}`}>{(section.answers ?? []).map((answer, index) => <div key={section.questionStart + index} className="rounded-xl bg-[var(--surface)] px-3 py-2 text-sm"><span className="text-[var(--muted-foreground)]">Q{section.questionStart + index}</span><span className="ml-2 font-semibold text-[var(--foreground)]">{answer || "—"}</span></div>)}</div>{section.status === "enviado" ? <div className="mt-3 flex flex-col gap-3 sm:flex-row"><Textarea disabled={isReviewing} value={note} placeholder="Observação obrigatória se devolver" onChange={(event) => setNote(event.target.value)} /><div className="flex gap-2"><Button variant="secondary" loading={isReviewing} disabled={isReviewing} onClick={() => void review(false)}><RotateCcw className="size-4" />Devolver</Button><Button loading={isReviewing} disabled={isReviewing} onClick={() => void review(true)}><Check className="size-4" />Aprovar</Button></div></div> : section.reviewNote ? <p className="mt-3 text-sm text-[var(--muted-foreground)]">Observação: {section.reviewNote}</p> : null}{message ? <p className="mt-2 text-sm text-[var(--muted-foreground)]">{message}</p> : null}</div>;
}

function TeacherSection({ exam, section, onChange }: { exam: CollaborativeExam; section: CollaborativeExam["sections"][number]; onChange: () => Promise<void> }) {
  const [answers, setAnswers] = useState(section.answers ?? []); const [message, setMessage] = useState(""); const [isSaving, setIsSaving] = useState(false);
  const editable = section.status === "rascunho" || section.status === "devolvido";
  const save = async (submit: boolean) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const body = await api<{ message: string }>(`/api/collaborative-exams/${exam.id}/sections/${section.id}/answers`, { method: "PUT", body: JSON.stringify({ answers, submit }) });
      setMessage(body.message);
      await onChange();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setIsSaving(false);
    }
  };
  return <div className="rounded-2xl border border-[var(--border)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-[var(--foreground)]">{section.subject} · Q{section.questionStart}–{section.questionEnd}</p><Badge tone={statusTone[section.status]}>{statusLabel[section.status]}</Badge></div>{section.reviewNote ? <p className="mt-2 text-sm text-[var(--error)]">Devolução: {section.reviewNote}</p> : null}<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{answers.map((answer, index) => <div key={index} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface)] p-3"><span className="text-sm font-semibold">Q{section.questionStart + index}</span><Select disabled={!editable || isSaving} value={answer} onChange={(event) => setAnswers((items) => items.map((value, i) => i === index ? event.target.value : value))}>{exam.alternatives.map((alternative) => <option key={alternative} value={alternative}>{alternative}</option>)}</Select></div>)}</div>{editable ? <div className="mt-4 flex flex-wrap gap-3"><Button variant="secondary" loading={isSaving} disabled={isSaving} onClick={() => void save(false)}>Salvar rascunho</Button><Button loading={isSaving} disabled={isSaving} onClick={() => void save(true)}><Send className="size-4" />Enviar para conferência</Button></div> : null}{message ? <p className="mt-3 text-sm text-[var(--muted-foreground)]">{message}</p> : null}</div>;
}
