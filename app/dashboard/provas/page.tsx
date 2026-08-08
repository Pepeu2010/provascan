import { DashboardShell } from "@/components/dashboard-shell";
import { CollaborativeExamsWorkspace } from "@/components/collaborative-exams-workspace";

export default function ProvasPage() {
  return (
    <DashboardShell active="/dashboard/provas">
      <CollaborativeExamsWorkspace />
    </DashboardShell>
  );
}
