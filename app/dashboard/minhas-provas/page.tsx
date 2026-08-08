import { CollaborativeExamsWorkspace } from "@/components/collaborative-exams-workspace";
import { DashboardShell } from "@/components/dashboard-shell";

export default function MyExamsPage() {
  return <DashboardShell active="/dashboard/minhas-provas"><CollaborativeExamsWorkspace /></DashboardShell>;
}
