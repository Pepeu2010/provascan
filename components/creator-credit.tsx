import { Sparkles } from "lucide-react";
import { CREATOR_CREDIT } from "@/lib/creator-credit";
import { cn } from "@/lib/utils";

type CreatorCreditProps = {
  className?: string;
  variant?: "badge" | "panel" | "inline" | "footer";
};

const variantStyles = {
  badge: {
    container:
      "inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--card-solid)_88%,transparent)] px-3 py-1.5 shadow-[var(--shadow-soft)]",
    eyebrow: "hidden",
    layout: "flex items-center gap-2",
    name: "text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]",
    summary: "hidden",
  },
  footer: {
    container:
      "rounded-[30px] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--card-solid)_96%,transparent),color-mix(in_srgb,var(--surface)_78%,transparent))] p-6 shadow-[var(--shadow-soft)]",
    eyebrow: "text-[11px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]",
    layout: "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
    name: "text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)] sm:text-3xl",
    summary: "max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]",
  },
  inline: {
    container:
      "flex items-center justify-between gap-3 rounded-[20px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_72%,transparent)] px-4 py-3",
    eyebrow: "text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]",
    layout: "flex min-w-0 items-center gap-3",
    name: "text-sm font-semibold text-[var(--foreground)]",
    summary: "text-xs text-[var(--muted-foreground)]",
  },
  panel: {
    container:
      "rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-solid)_96%,transparent),color-mix(in_srgb,var(--surface)_78%,transparent))] p-4",
    eyebrow: "text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]",
    layout: "flex items-start gap-3",
    name: "text-sm font-semibold text-[var(--foreground)]",
    summary: "mt-1 text-sm leading-6 text-[var(--muted-foreground)]",
  },
} as const;

export function CreatorCredit({ className, variant = "panel" }: CreatorCreditProps) {
  const styles = variantStyles[variant];

  return (
    <div className={cn(styles.container, className)}>
      <div className={styles.layout}>
        <div
          className={cn(
            "shrink-0 border border-[var(--border)] bg-[color-mix(in_srgb,var(--accent-soft)_72%,transparent)] text-[var(--accent)]",
            variant === "badge"
              ? "grid size-7 place-items-center rounded-full"
              : "grid size-10 place-items-center rounded-2xl",
          )}
        >
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0">
          {variant === "badge" ? (
            <p className={styles.name}>Por {CREATOR_CREDIT.name}</p>
          ) : (
            <>
              <p className={styles.eyebrow}>{CREATOR_CREDIT.label}</p>
              <p className={cn(variant === "footer" ? "mt-3" : "mt-1.5", styles.name)}>{CREATOR_CREDIT.name}</p>
              <p className={cn(variant === "footer" ? "mt-3" : "", styles.summary)}>
                {CREATOR_CREDIT.summary}{" "}
                <span className="font-semibold text-[var(--foreground)]">{CREATOR_CREDIT.name}</span>.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
