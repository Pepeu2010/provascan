import { DashboardShell } from "@/components/dashboard-shell";
import { StudentsManager } from "@/components/management-workspace";

export default function AlunosPage() {
  return (
    <DashboardShell active="/dashboard/alunos">
      <StudentsManager />
    </DashboardShell>
  );
}
