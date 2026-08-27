"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { CollaborativeExamsWorkspace } from "@/components/collaborative-exams-workspace";

export default function GabaritosPage() {
  return (
    <DashboardShell active="/dashboard/gabaritos">
      <CollaborativeExamsWorkspace showCreation={false} />
    </DashboardShell>
  );
}
