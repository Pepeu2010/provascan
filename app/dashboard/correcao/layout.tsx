import type { ReactNode } from "react";
import { requireProtectedPage } from "@/lib/server-route-guard";

export default async function CorrectionLayout({ children }: { children: ReactNode }) {
  await requireProtectedPage("/dashboard/correcao");
  return children;
}
