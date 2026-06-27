"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { AnswerKeyEditor } from "@/components/management-workspace";

export default function GabaritosPage() {
  return (
    <DashboardShell active="/dashboard/gabaritos">
      <AnswerKeyEditor />
    </DashboardShell>
  );
}
