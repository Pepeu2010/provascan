import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { DashboardMetric } from "@/types/domain";

export function SummaryCard({ metric }: { metric: DashboardMetric }) {
  return (
    <Card className="dashboard-stat-card group relative overflow-hidden p-5">
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">{metric.label}</p>
          <p className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">
            {metric.value}
          </p>
        </div>
        <span className="inline-flex size-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-strong)_72%,transparent)] text-[var(--accent)] transition-transform duration-300 group-hover:-translate-y-0.5">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
      <div className="relative z-10 mt-7 flex items-center justify-between gap-4 text-sm">
        <span className="text-[var(--muted-foreground)]">{metric.helper}</span>
        <span className="rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--accent-soft)_58%,transparent)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
          {metric.trend}
        </span>
      </div>
    </Card>
  );
}
