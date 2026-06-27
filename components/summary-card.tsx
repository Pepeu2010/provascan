import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { DashboardMetric } from "@/types/domain";

export function SummaryCard({ metric }: { metric: DashboardMetric }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--muted-foreground)]">{metric.label}</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            {metric.value}
          </p>
        </div>
        <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--accent)]">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
      <div className="mt-6 flex items-center justify-between text-sm">
        <span className="text-[var(--muted-foreground)]">{metric.helper}</span>
        <span className="font-medium text-[var(--accent)]">{metric.trend}</span>
      </div>
    </Card>
  );
}
