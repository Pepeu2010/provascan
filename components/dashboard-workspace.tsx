"use client";

import { motion } from "framer-motion";
import { useAppData } from "@/components/app-data-provider";
import { AnalyticsPanels } from "@/components/analytics-panels";
import { CorrectionWorkspace } from "@/components/correction-workspace";
import { StudentTable } from "@/components/student-table";
import { SummaryCard } from "@/components/summary-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function DashboardWorkspace() {
  const { analytics, data } = useAppData();
  const topStudent = analytics.studentRanking[0];
  const topOutcome = [...analytics.outcomeBreakdown].sort((a, b) => b.total - a.total)[0];

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {analytics.dashboardMetrics.map((metric) => (
            <SummaryCard key={metric.label} metric={metric} />
          ))}
        </div>

        <Card className="dashboard-grid-card hairline-grid relative overflow-hidden p-6">
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="neutral">Insights operacionais</Badge>
              <Badge tone="accent">Atualização imediata</Badge>
            </div>
            <h2 className="dashboard-section-title mt-4 max-w-xl text-3xl font-semibold text-[var(--foreground)]">
              Um cockpit de revisão pensado para a rotina de correção
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--muted-foreground)]">
              As métricas e os gráficos abaixo respondem em tempo real aos cadastros, gabaritos e correções salvas.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-solid)_90%,transparent),transparent)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  Melhor desempenho
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                  {topStudent ? topStudent.aluno : "Sem ranking ainda"}
                </p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {topStudent ? `${topStudent.percentual}% de aproveitamento` : "As correções aparecerão aqui."}
                </p>
              </div>

              <div className="rounded-[20px] border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-solid)_90%,transparent),transparent)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  Sinal dominante
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                  {topOutcome ? topOutcome.label : "Sem histórico"}
                </p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {topOutcome ? `${topOutcome.total} ocorrências processadas` : "O painel vai consolidar a operação."}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[20px] border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-strong)_82%,transparent),transparent)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                Capacidade atual
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">
                {data.classes.length} turmas ativas, {data.students.length} alunos monitorados e {data.exams.length} provas
                prontas para operação.
              </p>
            </div>
          </div>
        </Card>
      </motion.section>

      <div className="mt-5">
        <AnalyticsPanels analytics={analytics} />
      </div>
      <div className="mt-5">
        <CorrectionWorkspace compact />
      </div>
      <div className="mt-5">
        <StudentTable classes={data.classes} students={data.students} />
      </div>
    </>
  );
}
