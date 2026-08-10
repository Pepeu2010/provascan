import type { ReactNode } from "react";
import { AppDataProvider } from "@/components/app-data-provider";
import { requireProtectedPage } from "@/lib/server-route-guard";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireProtectedPage("/dashboard");
  return <AppDataProvider initialSession={session}>{children}</AppDataProvider>;
}
