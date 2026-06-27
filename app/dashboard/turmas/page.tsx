import { DashboardShell } from "@/components/dashboard-shell";
import { ClassesManager } from "@/components/management-workspace";

export default function TurmasPage() {
  return (
    <DashboardShell active="/dashboard/turmas">
      <ClassesManager />
    </DashboardShell>
  );
}
