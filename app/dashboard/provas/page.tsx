import { DashboardShell } from "@/components/dashboard-shell";
import { TeacherExamsWorkspace } from "@/components/teacher-exams-workspace";

export default function ProvasPage() {
  return (
    <DashboardShell active="/dashboard/provas">
      <TeacherExamsWorkspace />
    </DashboardShell>
  );
}
