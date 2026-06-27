import { DashboardShell } from "@/components/dashboard-shell";
import { ReportsWorkspace } from "@/components/management-workspace";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function RelatoriosPage() {
  return (
    <DashboardShell active="/dashboard/relatorios">
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">Relatórios e estatísticas</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Ranking, média da turma, questões mais erradas e histórico prontos para acompanhamento real.
            </p>
          </div>
          <Badge tone="accent">Dados operacionais</Badge>
        </div>
      </Card>
      <div className="mt-5">
        <ReportsWorkspace />
      </div>
    </DashboardShell>
  );
}
