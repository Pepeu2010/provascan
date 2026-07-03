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
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-[var(--shadow-soft)] backdrop-blur-sm",
        tone === "neutral" && "border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_84%,transparent)] text-[var(--muted-foreground)]",
        tone === "accent" && "border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[color-mix(in_srgb,var(--accent-soft)_92%,transparent)] text-[var(--accent)]",
        tone === "success" && "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success)]",
        tone === "error" && "border-[var(--error-border)] bg-[var(--error-soft)] text-[var(--error)]",
        tone === "warning" && "border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning)]",
      )}
    >
      {children}
    </span>
  );
}
