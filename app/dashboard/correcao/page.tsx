import { CorrectionWorkspace } from "@/components/correction-workspace";
import { DashboardShell } from "@/components/dashboard-shell";

export default function CorrecaoPage() {
  return (
    <DashboardShell active="/dashboard/correcao">
      <CorrectionWorkspace />
    </DashboardShell>
  );
}
