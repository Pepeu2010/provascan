"use client";

import "./answer-keys-workspace.css";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, BookOpenCheck, Check, ChevronRight, CircleAlert, ClipboardCheck, FileText,
  KeyRound, LockKeyhole, Printer, Search, ShieldCheck, Sparkles, Target, UsersRound,
} from "lucide-react";
import { PrintStudio } from "@/components/print-studio";
import { openPrint } from "@/components/teacher-exams-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  buildAnswerKeySummary,
  filterAnswerKeyExams,
  type AnswerKeyReadiness,
} from "@/lib/answer-key-library";
import type { ExamLifecycleStatus, TeacherExam, TeacherExamQuestion } from "@/types/teacher-exams";

type ApiResponse = { error?: string; exams?: TeacherExam[]; readOnly?: boolean };

const statusLabels: Record<ExamLifecycleStatus, string> = {
  aplicada: "Aplicada",
  arquivada: "Arquivada",
  publicada: "Publicada",
  rascunho: "Rascunho",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function getAnswerLabel(question: TeacherExamQuestion) {
  if (question.annulled) return "Questão anulada";
  if (question.type === "discursiva" || question.type === "resposta_curta" || question.type === "associacao") {
    return question.correctionCriteria.trim() || "Critério ainda não definido";
  }
  if (!question.correctAnswers.length) return "Resposta ainda não definida";
  return question.correctAnswers.map((answer) => {
    const index = question.alternatives.findIndex((alternative) => alternative === answer);
    return index >= 0 ? String.fromCharCode(65 + index) : "Resposta definida";
  }).join(" · ");
}

function answerOptions(question: TeacherExamQuestion) {
  if (question.type !== "multipla_escolha" && question.type !== "verdadeiro_falso") return [];
  return ["A", "B", "C", "D", "E"].map((label, index) => ({
    label,
    selected: question.correctAnswers.some((answer) => answer === question.alternatives[index]),
  }));
}

export function AnswerKeysWorkspace() {
  const [exams, setExams] = useState<TeacherExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("todas");
  const [readiness, setReadiness] = useState<AnswerKeyReadiness>("todos");
  const [selected, setSelected] = useState<TeacherExam | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/teacher-exams?arquivadas=1", { cache: "no-store", signal: controller.signal });
        const payload = await response.json() as ApiResponse;
        if (!response.ok || !payload.exams) throw new Error(payload.error || "Não foi possível carregar os gabaritos.");
        setExams(payload.exams);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMessage(error instanceof Error ? error.message : "Não foi possível carregar os gabaritos.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  const subjects = useMemo(() => [...new Set(exams.map((exam) => exam.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")), [exams]);
  const filtered = useMemo(() => filterAnswerKeyExams(exams, { query, readiness, subject }), [exams, query, readiness, subject]);
  const counts = useMemo(() => ({
    aplicados: exams.filter((exam) => exam.status === "aplicada").length,
    arquivados: exams.filter((exam) => exam.status === "arquivada").length,
    incompletos: exams.filter((exam) => !buildAnswerKeySummary(exam).complete || exam.needsReview).length,
    prontos: exams.filter((exam) => buildAnswerKeySummary(exam).complete && exam.status !== "rascunho" && exam.status !== "arquivada").length,
    todos: exams.length,
  }), [exams]);

  if (selected) return <AnswerKeyDetail exam={selected} onBack={() => setSelected(null)} />;

  const filtersActive = Boolean(query.trim()) || subject !== "todas" || readiness !== "todos";
  return (
    <div className="answer-keys mx-auto grid max-w-[1420px] gap-5">
      <section className="answer-keys__hero">
        <div className="answer-keys__hero-copy">
          <span className="answer-keys__hero-icon" aria-hidden="true"><KeyRound /></span>
          <div>
            <p className="answer-keys__eyebrow">RESPOSTAS E MATERIAIS</p>
            <h1>Central de gabaritos</h1>
            <p>Encontre respostas, confira a pontuação e prepare cartões para correção sem abrir o editor da prova.</p>
          </div>
        </div>
        <div className="answer-keys__privacy"><LockKeyhole className="size-4" /><span><strong>Respostas protegidas</strong><small>O conteúdo só aparece quando você abre o gabarito.</small></span></div>
      </section>

      {message ? <p className="answer-keys__message" role="status" aria-live="polite">{message}</p> : null}

      <section className="answer-keys__stats" aria-label="Resumo dos gabaritos">
        {([
          ["todos", "Todos", counts.todos],
          ["prontos", "Prontos", counts.prontos],
          ["incompletos", "Incompletos", counts.incompletos],
          ["aplicados", "Aplicados", counts.aplicados],
          ["arquivados", "Arquivados", counts.arquivados],
        ] as Array<[AnswerKeyReadiness, string, number]>).map(([value, label, count]) => (
          <button key={value} type="button" className={readiness === value ? "is-active" : ""} aria-pressed={readiness === value} onClick={() => setReadiness(value)}>
            <strong>{count}</strong><span>{label}</span>
          </button>
        ))}
      </section>

      <Card className="answer-keys__toolbar">
        <label className="answer-keys__search"><Search className="size-4" aria-hidden="true" /><span className="sr-only">Buscar gabaritos</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por prova, disciplina, turma ou professor" /></label>
        <label><span className="sr-only">Filtrar por disciplina</span><Select value={subject} onChange={(event) => setSubject(event.target.value)}><option value="todas">Todas as disciplinas</option>{subjects.map((item) => <option key={item} value={item}>{item}</option>)}</Select></label>
      </Card>

      {loading ? <AnswerKeySkeleton /> : filtered.length ? (
        <section className="answer-keys__grid" aria-label="Gabaritos encontrados">
          {filtered.map((exam) => <AnswerKeyCard key={exam.id} exam={exam} onOpen={() => setSelected(exam)} onMessage={setMessage} />)}
        </section>
      ) : <AnswerKeyEmpty filtered={filtersActive} />}
    </div>
  );
}

function AnswerKeyCard({ exam, onOpen, onMessage }: { exam: TeacherExam; onOpen: () => void; onMessage: (message: string) => void }) {
  const summary = buildAnswerKeySummary(exam);
  const ready = summary.complete && exam.status !== "rascunho" && exam.status !== "arquivada";
  const progress = summary.questionCount ? Math.round((summary.answered / summary.questionCount) * 100) : 0;
  return (
    <Card className="answer-key-card">
      <header>
        <span className={`answer-key-card__mark ${ready ? "is-ready" : ""}`} aria-hidden="true">{ready ? <ShieldCheck /> : <CircleAlert />}</span>
        <div className="min-w-0 flex-1"><p>{exam.subject || "Sem disciplina"}</p><h2>{exam.title}</h2></div>
        <Badge tone={ready ? "success" : exam.status === "arquivada" ? "neutral" : "warning"}>{ready ? "Gabarito pronto" : exam.status === "arquivada" ? "Arquivado" : "Precisa completar"}</Badge>
      </header>
      <div className="answer-key-card__meta"><span><UsersRound />{exam.audienceLabel || "Sem turma"}</span><span><ClipboardCheck />{summary.questionCount} {summary.questionCount === 1 ? "questão" : "questões"}</span><span><Target />{summary.totalWeight.toLocaleString("pt-BR")} pontos</span></div>
      <div className="answer-key-card__progress"><div><span>{summary.answered} de {summary.questionCount} respostas definidas</span><strong>{progress}%</strong></div><span role="progressbar" aria-label={`Gabarito de ${exam.title}: ${progress}% completo`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }} /></span></div>
      <div className="answer-key-card__facts"><span>{statusLabels[exam.status]}</span><span>Atualizado em {formatDate(exam.updatedAt)}</span>{summary.annulled ? <span>{summary.annulled} anulada{summary.annulled === 1 ? "" : "s"}</span> : null}</div>
      <footer>
        {summary.complete ? <Button className="flex-1" onClick={onOpen}><BookOpenCheck className="size-4" />Visualizar gabarito</Button> : <Button asChild className="flex-1"><Link href="/dashboard/provas"><Sparkles className="size-4" />Completar em Provas</Link></Button>}
        <Button variant="secondary" size="icon" aria-label={`Gerar cartão-resposta de ${exam.title}`} onClick={() => onMessage(openPrint(exam, true) ? "Cartão-resposta aberto para impressão." : "Permita pop-ups para gerar o cartão.")}><FileText className="size-4" /></Button>
        <Button variant="secondary" size="icon" aria-label={`Imprimir ${exam.title}`} onClick={() => onMessage(openPrint(exam) ? "Prova aberta para impressão." : "Permita pop-ups para imprimir.")}><Printer className="size-4" /></Button>
      </footer>
    </Card>
  );
}

function AnswerKeyDetail({ exam, onBack }: { exam: TeacherExam; onBack: () => void }) {
  const summary = buildAnswerKeySummary(exam);
  return (
    <div className="answer-key-detail mx-auto grid max-w-[1180px] gap-5">
      <Button variant="ghost" className="w-fit" onClick={onBack}><ArrowLeft className="size-4" />Voltar aos gabaritos</Button>
      <header className="answer-key-detail__header">
        <div><p className="answer-keys__eyebrow">GABARITO · VERSÃO {exam.version}</p><h1>{exam.title}</h1><span>{exam.subject || "Sem disciplina"} · {exam.audienceLabel || "Sem turma"} · {exam.creatorName}</span></div>
        <Badge tone={summary.complete ? "success" : "warning"}>{summary.complete ? "Completo" : `${summary.pending} pendente${summary.pending === 1 ? "" : "s"}`}</Badge>
      </header>
      <section className="answer-key-detail__summary" aria-label="Resumo do gabarito">
        <div><ClipboardCheck /><span><strong>{summary.questionCount}</strong> questões</span></div>
        <div><Target /><span><strong>{summary.totalWeight.toLocaleString("pt-BR")}</strong> pontos</span></div>
        <div><Check /><span><strong>{summary.answered}</strong> definidas</span></div>
        <div><CircleAlert /><span><strong>{summary.annulled}</strong> anuladas</span></div>
      </section>
      <Card className="answer-key-detail__sheet">
        <header><div><p>RESPOSTAS OFICIAIS</p><h2>Questão por questão</h2></div><LockKeyhole className="size-5" aria-label="Conteúdo protegido" /></header>
        <ol aria-label="Respostas oficiais por questão">{exam.questions.map((question, index) => (
          <li key={question.id} className={question.annulled ? "is-annulled" : ""}>
            <span className="answer-key-detail__number">{index + 1}</span>
            <div><small>{question.type.replaceAll("_", " ")}</small><strong>{getAnswerLabel(question)}</strong>{answerOptions(question).length ? <span className="answer-key-detail__choices" aria-label={`Alternativas da questão ${index + 1}`}>{answerOptions(question).map((option) => <i key={option.label} className={option.selected ? "is-correct" : ""}>{option.label}</i>)}</span> : null}</div>
            <span className="answer-key-detail__weight">{question.weight.toLocaleString("pt-BR")} pt{question.weight === 1 ? "" : "s"}</span>
          </li>
        ))}</ol>
      </Card>
      <PrintStudio exam={exam} initialKind="cartao" />
      <div className="answer-key-detail__actions">{(exam.status === "publicada" || exam.status === "aplicada") ? <Button asChild><Link href={`/dashboard/correcao?prova=${encodeURIComponent(exam.id)}`}>Corrigir agora<ChevronRight className="size-4" /></Link></Button> : <Button asChild><Link href="/dashboard/provas">Abrir em Provas<ChevronRight className="size-4" /></Link></Button>}</div>
    </div>
  );
}

function AnswerKeyEmpty({ filtered }: { filtered: boolean }) {
  return <Card className="answer-keys__empty"><span><KeyRound /></span><h2>{filtered ? "Nenhum gabarito corresponde aos filtros" : "Nenhum gabarito por aqui ainda"}</h2><p>{filtered ? "Limpe a busca ou escolha outra situação." : "Crie uma prova e defina as respostas para vê-la nesta central."}</p><Button asChild><Link href="/dashboard/provas">Ir para Provas<ChevronRight className="size-4" /></Link></Button></Card>;
}

function AnswerKeySkeleton() {
  return <div className="answer-keys__grid" aria-label="Carregando gabaritos">{[1, 2, 3, 4].map((item) => <Card key={item} className="h-72 animate-pulse bg-[var(--surface)]" />)}</div>;
}
