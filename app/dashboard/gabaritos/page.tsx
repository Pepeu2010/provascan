"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { TeacherExamsWorkspace } from "@/components/teacher-exams-workspace";

export default function GabaritosPage() {
  return (
    <DashboardShell active="/dashboard/gabaritos">
      <TeacherExamsWorkspace libraryOnly />
    </DashboardShell>
  );
}
