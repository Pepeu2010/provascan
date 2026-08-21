"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, UsersRound } from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { ExamSheetIcon, ScanCaptureIcon } from "@/components/provascan-action-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function DashboardWorkspace() {
  const { data } = useAppData();
  const recentCorrections = [...data.corrections]
    .sort((left, right) => right.correction.data.localeCompare(left.correction.data))
    .slice(0, 4);
  const upcomingExams = [...data.exams]
    .sort((left, right) => right.data.localeCompare(left.data))
    .slice(0, 4);
  const activeStudents = data.students.filter((student) => student.status === "Ativo").length;

  return (
    <div className="dashboard-command-center mx-auto grid max-w-[1380px] gap-5">
      <section className="dashboard-next-action">
        <div className="dashboard-next-action__icon" aria-hidden="true">
          <ScanCaptureIcon className="size-8" />
        </div>
        <div className="min-w-0 flex-1">
          <h2>Corrigir provas por foto</h2>
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
