"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpenCheck, CheckCircle2, CircleAlert, ClipboardList, FileUp, History, Pencil, UsersRound } from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { ExamSheetIcon, ScanCaptureIcon } from "@/components/provascan-action-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EXTERNAL_CORRECTION_DRAFT_KEY, buildDraftResumeLabel, parseExternalCorrectionDraft } from "@/lib/external-correction-draft";
import { flushOfflineSyncQueue } from "@/lib/offline-sync-queue";
import { UsabilityControls } from "@/components/usability-controls";
import type { TeacherExam } from "@/types/teacher-exams";

export function DashboardWorkspace() {
  const { data, session } = useAppData();
  const [draftLabel, setDraftLabel] = useState("");
  const [teacherExams, setTeacherExams] = useState<TeacherExam[]>([]);

  useEffect(() => {
    const draft = parseExternalCorrectionDraft(window.localStorage.getItem(EXTERNAL_CORRECTION_DRAFT_KEY));
    const label = draft && draft.stage !== "source" ? buildDraftResumeLabel(draft) : "";
    const timeout = window.setTimeout(() => setDraftLabel(label), 0);
    if (navigator.onLine) void flushOfflineSyncQueue(window.localStorage);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (session?.role !== "professor") return;
    let cancelled = false;
    void fetch("/api/teacher-exams?arquivadas=1")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("dashboard")))
      .then((payload: { exams?: TeacherExam[] }) => { if (!cancelled) setTeacherExams(payload.exams ?? []); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [session?.role]);
  const recentCorrections = [...data.corrections]
    .sort((left, right) => right.correction.data.localeCompare(left.correction.data))
    .slice(0, 4);
  const upcomingExams = [...data.exams]
    .sort((left, right) => right.data.localeCompare(left.data))
    .slice(0, 4);
  const activeStudents = data.students.filter((student) => student.status === "Ativo").length;

  if (session?.role === "professor") {
    return <TeacherDashboard exams={teacherExams} corrections={data.corrections.length} students={activeStudents} />;
  }

  return (
    <div className="dashboard-command-center mx-auto grid max-w-[1380px] gap-5">
      <UsabilityControls tutorialOnly />
      <section className="dashboard-next-action">
        <div className="dashboard-next-action__icon" aria-hidden="true">
          <ScanCaptureIcon className="size-8" />
        </div>
        <div className="min-w-0 flex-1">
          <h2>Corrigir provas</h2>
          <p>Envie o cartão-resposta. O sistema lê as marcações e deixa para você apenas a conferência final.</p>
        </div>
        <div className="dashboard-next-action__meta">
          <span>{data.exams.length}</span>
          <small>provas disponíveis</small>
        </div>
        <Button asChild size="lg" className="dashboard-next-action__button">
          <Link href="/dashboard/correcao">
            Abrir correção
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </section>

      {draftLabel ? <Card className="flex flex-col gap-4 border-[var(--accent)] bg-[var(--accent-soft)] p-5 sm:flex-row sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-white"><History className="size-5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><h2 className="font-semibold text-[var(--foreground)]">Você tem uma correção em andamento</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">O rascunho foi salvo automaticamente neste aparelho.</p></div>
        <Button asChild size="lg"><Link href="/dashboard/correcao?modo=externa">{draftLabel}<ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
      </Card> : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(330px,0.75fr)]">
        <Card className="dashboard-worklist">
          <div className="dashboard-worklist__heading">
            <div>
              <h2>Provas prontas</h2>
              <p>Escolha uma prova e comece a correção.</p>
            </div>
            <Link href="/dashboard/provas" className="dashboard-text-link">
              Gerenciar provas <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          {upcomingExams.length ? (
            <div className="dashboard-worklist__rows">
              {upcomingExams.map((exam) => {
                const audienceSize = data.students.filter((student) => student.status === "Ativo" && student.turma === exam.audienceId).length;
                return (
                  <div key={exam.id} className="dashboard-worklist__row">
                    <div className="dashboard-row-icon" aria-hidden="true"><ExamSheetIcon className="size-[22px]" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="dashboard-row-title">{exam.titulo}</p>
                      <p className="dashboard-row-detail">{exam.audienceLabel} · {exam.quantidadeQuestoes} questões{audienceSize ? ` · ${audienceSize} alunos` : ""}</p>
                    </div>
                    <Link href="/dashboard/correcao" className="dashboard-row-action" aria-label={`Corrigir ${exam.titulo}`}>
                      Corrigir <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <DashboardEmptyState
              icon={<ClipboardList className="size-5" strokeWidth={1.8} />}
              title="Nenhuma prova pronta"
              detail="Crie uma prova e salve o gabarito para começar a corrigir."
              href="/dashboard/provas"
              action="Criar prova"
            />
          )}
        </Card>

        <Card className="dashboard-activity">
          <div className="dashboard-worklist__heading">
            <div>
              <h2>Últimas correções</h2>
              <p>{data.corrections.length ? "Resultado salvo no histórico." : "A atividade aparecerá aqui."}</p>
            </div>
            <Link href="/dashboard/relatorios" className="dashboard-text-link">
              Relatórios <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          {recentCorrections.length ? (
            <div className="dashboard-activity__rows">
              {recentCorrections.map((item) => (
                <div key={item.correction.id} className="dashboard-activity__row">
                  <CheckCircle2 className="size-5 text-[var(--accent)]" aria-hidden="true" strokeWidth={1.8} />
                  <div className="min-w-0">
                    <p>{item.aluno.nome}</p>
                    <span>{item.prova.titulo}</span>
                  </div>
                  <strong className="numeric">{item.correction.percentual}%</strong>
                </div>
              ))}
            </div>
          ) : (
            <DashboardEmptyState
              icon={<UsersRound className="size-5" strokeWidth={1.8} />}
              title={`${activeStudents} alunos ativos`}
              detail="Depois da primeira correção, o histórico fica disponível aqui."
              href="/dashboard/correcao"
              action="Corrigir agora"
            />
          )}
        </Card>
      </section>
    </div>
  );
}

function TeacherDashboard({ exams, corrections, students }: { exams: TeacherExam[]; corrections: number; students: number }) {
  const drafts = exams.filter((exam) => exam.status === "rascunho");
  const applied = exams.filter((exam) => exam.status === "aplicada");
  const needsReview = exams.filter((exam) => exam.needsReview);
  const recent = exams.filter((exam) => exam.status !== "arquivada").slice(0, 4);
  return <div className="dashboard-command-center mx-auto grid max-w-[1380px] gap-5">
    <section className="dashboard-next-action">
      <div className="dashboard-next-action__icon" aria-hidden="true"><BookOpenCheck className="size-8" /></div>
      <div className="min-w-0 flex-1"><h2>O que você quer fazer agora?</h2><p>Crie uma prova do zero ou importe um arquivo que já está pronto.</p></div>
      <Button asChild size="lg" className="dashboard-next-action__button"><Link href="/dashboard/provas"><Pencil className="size-4" />Criar prova<ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
    </section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo do professor">
      {[{ label: "Minhas provas", value: exams.length, helper: "Total criado por você" }, { label: "Rascunhos", value: drafts.length, helper: "Continue quando quiser" }, { label: "Provas aplicadas", value: applied.length, helper: "Com histórico protegido" }, { label: "Alunos corrigidos", value: corrections, helper: `${students} alunos disponíveis` }].map((item) => <Card key={item.label} className="p-5"><p className="text-sm font-semibold text-[var(--muted-foreground)]">{item.label}</p><strong className="mt-3 block text-3xl tracking-[-.04em]">{item.value}</strong><span className="mt-2 block text-xs text-[var(--muted-foreground)]">{item.helper}</span></Card>)}
    </section>
    {needsReview.length ? <Card className="flex flex-col gap-4 border-[color-mix(in_srgb,var(--warning)_45%,var(--border))] bg-[color-mix(in_srgb,var(--warning)_8%,var(--card-solid))] p-5 sm:flex-row sm:items-center"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--warning)_16%,var(--surface))] text-[var(--warning)]"><CircleAlert className="size-5" /></span><div className="min-w-0 flex-1"><h2 className="font-semibold">{needsReview.length} {needsReview.length === 1 ? "prova importada precisa" : "provas importadas precisam"} de revisão</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Revise o conteúdo identificado antes de publicar.</p></div><Button asChild variant="secondary"><Link href="/dashboard/provas">Revisar agora<ArrowRight className="size-4" /></Link></Button></Card> : null}
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
      <Card className="dashboard-worklist"><div className="dashboard-worklist__heading"><div><h2>Provas recentes</h2><p>Continue um rascunho ou use uma prova publicada.</p></div><Link href="/dashboard/provas" className="dashboard-text-link">Ver todas <ArrowRight className="size-4" /></Link></div>{recent.length ? <div className="dashboard-worklist__rows">{recent.map((exam) => <div key={exam.id} className="dashboard-worklist__row"><div className="dashboard-row-icon" aria-hidden="true"><BookOpenCheck className="size-5" /></div><div className="min-w-0 flex-1"><p className="dashboard-row-title">{exam.title}</p><p className="dashboard-row-detail">{exam.subject || "Sem disciplina"} · {exam.questions.length} questões · {exam.status === "rascunho" ? "Rascunho" : exam.status === "publicada" ? "Publicada" : "Aplicada"}</p></div><Link href="/dashboard/provas" className="dashboard-row-action">{exam.status === "rascunho" ? "Continuar" : "Abrir"}<ArrowRight className="size-4" /></Link></div>)}</div> : <DashboardEmptyState icon={<ClipboardList className="size-5" />} title="Nenhuma prova criada" detail="Comece manualmente ou importe um arquivo existente." href="/dashboard/provas" action="Criar prova" />}</Card>
      <Card className="dashboard-start-actions"><h2>Começar uma prova</h2><p>Escolha o jeito mais rápido para você.</p><div><Button asChild size="lg"><Link href="/dashboard/provas"><Pencil className="size-4" />Criar do zero</Link></Button><Button asChild size="lg" variant="secondary"><Link href="/dashboard/provas"><FileUp className="size-4" />Importar arquivo</Link></Button>{drafts[0] ? <Button asChild size="lg" variant="secondary"><Link href="/dashboard/provas"><History className="size-4" />Continuar rascunho</Link></Button> : null}</div></Card>
    </section>
  </div>;
}

function DashboardEmptyState({
  action,
  detail,
  href,
  icon,
  title,
}: {
  action: string;
  detail: string;
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="dashboard-empty-state">
      <div className="dashboard-row-icon" aria-hidden="true">{icon}</div>
      <div>
        <p>{title}</p>
        <span>{detail}</span>
      </div>
      <Link href={href} className="dashboard-text-link">
        {action} <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
