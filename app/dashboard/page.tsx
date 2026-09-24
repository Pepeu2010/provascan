import { DashboardShell } from "@/components/dashboard-shell";
import { DashboardWorkspace } from "@/components/dashboard-workspace";
import { requireProtectedPage } from "@/lib/server-route-guard";

export default async function DashboardPage() {
  await requireProtectedPage("/dashboard");
  return (
    <DashboardShell active="/dashboard">
      <DashboardWorkspace />
    </DashboardShell>
  );
}
