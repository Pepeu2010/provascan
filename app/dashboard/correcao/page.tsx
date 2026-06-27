import { CorrectionWorkspace } from "@/components/correction-workspace";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";

export default function CorrecaoPage() {
  return (
    <DashboardShell active="/dashboard/correcao">
      <Card className="mb-5 p-6">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">Correção por foto</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">
          Este é o fluxo principal operacional: selecione a prova, revise as respostas e salve o resultado no histórico.
        </p>
      </Card>
      <CorrectionWorkspace />
    </DashboardShell>
  );
}
