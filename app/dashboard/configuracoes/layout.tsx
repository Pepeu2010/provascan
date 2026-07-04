import type { ReactNode } from "react";
import { requireProtectedPage } from "@/lib/server-route-guard";

export default async function ConfiguracoesLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireProtectedPage("/dashboard/configuracoes");
  return children;
}
