import { AnswerKeysWorkspace } from "@/components/answer-keys-workspace";
import { DashboardShell } from "@/components/dashboard-shell";

export default function GabaritosPage() {
  return (
    <DashboardShell active="/dashboard/gabaritos">
      <AnswerKeysWorkspace />
    </DashboardShell>
  );
}
