import type { ReactNode } from "react";
import { requireProtectedPage } from "@/lib/server-route-guard";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireProtectedPage("/dashboard");
  return children;
}
