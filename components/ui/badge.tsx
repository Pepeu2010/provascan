import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: "neutral" | "accent" | "success" | "error" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
        tone === "neutral" && "border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)]",
        tone === "accent" && "border-[var(--accent-soft)] bg-[var(--accent-soft)] text-[var(--accent-strong)]",
        tone === "success" && "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success)]",
        tone === "error" && "border-[var(--error-border)] bg-[var(--error-soft)] text-[var(--error)]",
        tone === "warning" && "border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
