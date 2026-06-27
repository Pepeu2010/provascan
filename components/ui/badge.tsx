import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "error" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        tone === "neutral" && "bg-[var(--surface)] text-[var(--muted-foreground)]",
        tone === "accent" && "bg-[var(--accent-soft)] text-[var(--accent)]",
        tone === "success" && "bg-[var(--success-soft)] text-[var(--success)]",
        tone === "error" && "bg-[var(--error-soft)] text-[var(--error)]",
        tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning)]",
      )}
    >
      {children}
    </span>
  );
}
