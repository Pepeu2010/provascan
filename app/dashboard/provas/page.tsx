import { DashboardShell } from "@/components/dashboard-shell";
import { ExamsManager } from "@/components/management-workspace";

export default function ProvasPage() {
  return (
    <DashboardShell active="/dashboard/provas">
      <ExamsManager />
    </DashboardShell>
  );
}
