"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardCheck, Plus, RotateCcw, Send, ShieldCheck } from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { canManageAcademicExams } from "@/lib/collaborative-access";
import type { CollaborativeExam, ExamSectionStatus } from "@/types/collaborative-exams";

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
  const [sections, setSections] = useState<DraftSection[]>([{ subject: "", teacherId: "", questionCount: "10" }]);

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
    try {
      await api("/api/collaborative-exams", { method: "POST", body: JSON.stringify({ title, audienceId: audience?.id || "geral", audienceLabel: audience?.nome || "Aplicação geral", groupType: audience?.groupType || "GERAL", yearSegment: audience?.yearSegment || "OUTROS", alternatives: alternatives.split(",").map((item) => item.trim()).filter(Boolean), examDate: date, sections: sections.map((item) => ({ subject: item.subject, teacherId: item.teacherId, questionCount: Number(item.questionCount) })) }) });
      setMessage("Prova-base criada e distribuída aos professores."); setTitle(""); setSections([{ subject: "", teacherId: "", questionCount: "10" }]); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível criar a prova."); }
  };
  if (!session || loading) return <CollaborativeExamsLoading />;

  return <div className="grid gap-5">
    <Card className="collaborative-exams__intro p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h2 className="text-2xl font-semibold text-[var(--foreground)]">{management ? "Provas colaborativas" : "Minhas provas"}</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">{management ? "Monte a prova-base, distribua os blocos e só libere a operação quando todos forem aprovados." : "Preencha apenas as questões atribuídas a você e envie o bloco para conferência."}</p></div><Badge tone={management ? "accent" : "neutral"}>{management ? "Gestão acadêmica" : "Acesso do professor"}</Badge></div>
      {management ? <div className="mt-6 grid gap-4"><div className="grid gap-3 md:grid-cols-2"><Input placeholder="Título da prova" value={title} onChange={(event) => setTitle(event.target.value)} /><Select value={audienceId} onChange={(event) => setAudienceId(event.target.value)}><option value="">Aplicação geral</option>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /><Input placeholder="Alternativas: A,B,C,D,E" value={alternatives} onChange={(event) => setAlternatives(event.target.value)} /></div><div className="grid gap-3">{sections.map((item, index) => <div key={index} className="grid gap-3 rounded-2xl border border-[var(--border)] p-4 md:grid-cols-[1fr_1fr_140px_auto]"><Input placeholder="Matéria" value={item.subject} onChange={(event) => setSections((current) => current.map((value, i) => i === index ? { ...value, subject: event.target.value } : value))} /><Select value={item.teacherId} onChange={(event) => setSections((current) => current.map((value, i) => i === index ? { ...value, teacherId: event.target.value } : value))}><option value="">Professor responsável</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</Select><Input type="number" min="1" placeholder="Questões" value={item.questionCount} onChange={(event) => setSections((current) => current.map((value, i) => i === index ? { ...value, questionCount: event.target.value } : value))} /><Button variant="secondary" onClick={() => setSections((current) => current.length === 1 ? current : current.filter((_, i) => i !== index))}>Remover</Button></div>)}</div><div className="flex flex-wrap items-center gap-3"><Button variant="secondary" onClick={() => setSections((current) => [...current, { subject: "", teacherId: "", questionCount: "10" }])}><Plus className="size-4" />Adicionar matéria</Button><Button onClick={() => void create()} disabled={!title.trim() || !sections.every((item) => item.subject.trim() && item.teacherId && Number(item.questionCount) > 0)}><ClipboardCheck className="size-4" />Criar prova-base</Button><Badge tone="accent">{total} questões globais</Badge></div></div> : null}
      {message ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
    </Card>
    {exams.length ? exams.map((exam) => <ExamCard key={exam.id} exam={exam} management={management} onChange={load} />) : <Card className="p-6"><p className="text-sm text-[var(--muted-foreground)]">{management ? "Nenhuma prova-base criada." : "Nenhum bloco de prova foi atribuído a você."}</p></Card>}
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

function ExamCard({ exam, management, onChange }: { exam: CollaborativeExam; management: boolean; onChange: () => Promise<void> }) {
  const [message, setMessage] = useState("");
  const release = async () => { try { await api(`/api/collaborative-exams/${exam.id}/release`, { method: "POST", body: "{}" }); setMessage("Prova liberada para impressão e correção."); await onChange(); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível liberar."); } };
  const complete = exam.sections.every((item) => item.status === "aprovado");
  return <Card className="p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-xl font-semibold text-[var(--foreground)]">{exam.title}</h3><p className="mt-1 text-sm text-[var(--muted-foreground)]">{exam.audienceLabel} · {exam.questionCount} questões · {exam.examDate}</p></div>{exam.releasedAt ? <Badge tone="success">Liberada</Badge> : management ? <Button disabled={!complete} onClick={() => void release()}><ShieldCheck className="size-4" />Liberar prova</Button> : null}</div><div className="mt-5 grid gap-3">{exam.sections.map((section) => management ? <ManagementSection key={section.id} exam={exam} section={section} onChange={onChange} /> : <TeacherSection key={section.id} exam={exam} section={section} onChange={onChange} />)}</div>{message ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p> : null}</Card>;
}

function ManagementSection({ exam, section, onChange }: { exam: CollaborativeExam; section: CollaborativeExam["sections"][number]; onChange: () => Promise<void> }) {
  const [note, setNote] = useState(section.reviewNote); const [message, setMessage] = useState("");
  const review = async (approved: boolean) => { try { const body = await api<{ message: string }>(`/api/collaborative-exams/${exam.id}/sections/${section.id}/review`, { method: "POST", body: JSON.stringify({ approved, note }) }); setMessage(body.message); await onChange(); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível revisar."); } };
  return <div className="rounded-2xl border border-[var(--border)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-[var(--foreground)]">{section.subject} · Q{section.questionStart}–{section.questionEnd}</p><Badge tone={statusTone[section.status]}>{statusLabel[section.status]}</Badge></div><p className="mt-1 text-sm text-[var(--muted-foreground)]">Responsável: {section.teacherName}</p>{section.status === "enviado" ? <div className="mt-3 flex flex-col gap-3 sm:flex-row"><Textarea value={note} placeholder="Observação obrigatória se devolver" onChange={(event) => setNote(event.target.value)} /><div className="flex gap-2"><Button variant="secondary" onClick={() => void review(false)}><RotateCcw className="size-4" />Devolver</Button><Button onClick={() => void review(true)}><Check className="size-4" />Aprovar</Button></div></div> : section.reviewNote ? <p className="mt-3 text-sm text-[var(--muted-foreground)]">Observação: {section.reviewNote}</p> : null}{message ? <p className="mt-2 text-sm text-[var(--muted-foreground)]">{message}</p> : null}</div>;
}

function TeacherSection({ exam, section, onChange }: { exam: CollaborativeExam; section: CollaborativeExam["sections"][number]; onChange: () => Promise<void> }) {
  const [answers, setAnswers] = useState(section.answers ?? []); const [message, setMessage] = useState("");
  const editable = section.status === "rascunho" || section.status === "devolvido";
  const save = async (submit: boolean) => { try { const body = await api<{ message: string }>(`/api/collaborative-exams/${exam.id}/sections/${section.id}/answers`, { method: "PUT", body: JSON.stringify({ answers, submit }) }); setMessage(body.message); await onChange(); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar."); } };
  return <div className="rounded-2xl border border-[var(--border)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-[var(--foreground)]">{section.subject} · Q{section.questionStart}–{section.questionEnd}</p><Badge tone={statusTone[section.status]}>{statusLabel[section.status]}</Badge></div>{section.reviewNote ? <p className="mt-2 text-sm text-[var(--error)]">Devolução: {section.reviewNote}</p> : null}<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{answers.map((answer, index) => <div key={index} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface)] p-3"><span className="text-sm font-semibold">Q{section.questionStart + index}</span><Select disabled={!editable} value={answer} onChange={(event) => setAnswers((items) => items.map((value, i) => i === index ? event.target.value : value))}>{exam.alternatives.map((alternative) => <option key={alternative} value={alternative}>{alternative}</option>)}</Select></div>)}</div>{editable ? <div className="mt-4 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => void save(false)}>Salvar rascunho</Button><Button onClick={() => void save(true)}><Send className="size-4" />Enviar para conferência</Button></div> : null}{message ? <p className="mt-3 text-sm text-[var(--muted-foreground)]">{message}</p> : null}</div>;
}
