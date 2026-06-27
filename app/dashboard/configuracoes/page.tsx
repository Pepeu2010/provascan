import { DashboardShell } from "@/components/dashboard-shell";
import { SettingsWorkspace } from "@/components/management-workspace";

export default function ConfiguracoesPage() {
  return (
    <DashboardShell active="/dashboard/configuracoes">
      <SettingsWorkspace />
    </DashboardShell>
  );
}
