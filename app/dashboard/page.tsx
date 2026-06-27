import { DashboardShell } from "@/components/dashboard-shell";
import { DashboardWorkspace } from "@/components/dashboard-workspace";

export default function DashboardPage() {
  return (
    <DashboardShell active="/dashboard">
      <DashboardWorkspace />
    </DashboardShell>
  );
}
