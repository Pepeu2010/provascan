"use client";

import { useAppData } from "@/components/app-data-provider";
import { AnalyticsPanels } from "@/components/analytics-panels";
import { CorrectionWorkspace } from "@/components/correction-workspace";
import { StudentTable } from "@/components/student-table";
import { SummaryCard } from "@/components/summary-card";
import { Card } from "@/components/ui/card";

export function DashboardWorkspace() {
  const { analytics, data } = useAppData();

  return (
    <>
      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-5 sm:grid-cols-2">
          {analytics.dashboardMetrics.map((metric) => (
            <SummaryCard key={metric.label} metric={metric} />
          ))}
        </div>
        <Card className="p-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
            Últimas correções
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
            Acompanhe o que acabou de ser processado
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            As métricas e gráficos abaixo respondem em tempo real aos cadastros, gabaritos e correções salvas.
          </p>
        </Card>
      </section>
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
