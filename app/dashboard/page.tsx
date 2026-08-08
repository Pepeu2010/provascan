import { DashboardShell } from "@/components/dashboard-shell";
import { DashboardWorkspace } from "@/components/dashboard-workspace";
import { requireProtectedPage } from "@/lib/server-route-guard";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await requireProtectedPage("/dashboard");
  if (session.role === "professor") redirect("/dashboard/minhas-provas");
  return (
    <DashboardShell active="/dashboard">
      <DashboardWorkspace />
    </DashboardShell>
  );
}
