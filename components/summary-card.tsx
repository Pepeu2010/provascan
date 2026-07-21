import { Card } from "@/components/ui/card";
import type { DashboardMetric } from "@/types/domain";

export function SummaryCard({ metric }: { metric: DashboardMetric }) {
  return (
    <Card className="dashboard-stat-card relative p-5">
      <div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">{metric.label}</p>
          <p className="numeric mt-4 text-4xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">
            {metric.value}
          </p>
        </div>
      </div>
      <div className="mt-7 flex items-center justify-between gap-4 text-sm">
        <span className="text-[var(--muted-foreground)]">{metric.helper}</span>
        <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-strong)]">
          {metric.trend}
        </span>
      </div>
    </Card>
  );
}
