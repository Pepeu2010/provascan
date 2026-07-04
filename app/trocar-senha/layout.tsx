import type { ReactNode } from "react";
import { requireProtectedPage } from "@/lib/server-route-guard";

export default async function ChangePasswordLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireProtectedPage("/trocar-senha");
  return children;
}
