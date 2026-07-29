import Image from "next/image";
import { ScanSearch } from "lucide-react";
import { cn } from "@/lib/utils";

type ProvaScanLogoProps = {
  compact?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "full" | "sidebar";
  className?: string;
  priority?: boolean;
};

const sizeMap = {
  sm: {
    shell: "gap-3",
    mark: "size-[58px] rounded-[20px]",
    title: "text-lg",
    subtitle: "text-[11px]",
    eyebrow: "text-[10px]",
  },
  md: {
    shell: "gap-3.5",
    mark: "size-[68px] rounded-[22px]",
    title: "text-[1.35rem]",
    subtitle: "text-xs",
    eyebrow: "text-[10px]",
  },
  lg: {
    shell: "gap-4",
    mark: "size-[82px] rounded-[26px]",
    title: "text-[1.65rem]",
    subtitle: "text-sm",
    eyebrow: "text-[11px]",
  },
} as const;

function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden border border-[color-mix(in_srgb,var(--accent)_34%,var(--border))] bg-[#0c1714] shadow-[0_16px_32px_rgb(0_0_0_/_32%)]",
        className,
      )}
    >
      <Image
        src="/provascan-mark-v2.png"
        alt=""
        fill
        sizes="(max-width: 767px) 40px, 82px"
        className="object-cover"
        priority
      />
    </div>
  );
}

export function ProvaScanLogo({
  compact = false,
  size = "md",
  variant = "full",
  className,
}: ProvaScanLogoProps) {
  const styles = sizeMap[size];

  if (variant === "sidebar") {
    if (compact) {
      return (
        <div className={cn("grid size-10 place-items-center", className)} aria-label="ProvaScan">
          <LogoMark className="size-10 rounded-xl" />
        </div>
      );
    }

    return (
      <div
        className={cn(
          "flex min-w-0 items-center gap-3",
          className,
        )}
      >
        <LogoMark className="size-12 shrink-0 rounded-2xl" />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.36em] text-[var(--muted-foreground)]">
            ProvaScan
          </p>
          <p className="mt-1 whitespace-nowrap text-base font-semibold leading-none tracking-[-0.03em] text-[var(--foreground)]">
            Corretor <span className="text-[var(--accent)]">de Provas</span>
          </p>
          <p className="mt-1.5 truncate text-xs leading-5 text-[var(--muted-foreground)]">
            Correção inteligente
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", styles.shell, className)}>
      <LogoMark className={styles.mark} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("font-mono uppercase tracking-[0.34em] text-[var(--muted-foreground)]", styles.eyebrow)}>
            ProvaScan
          </span>
          <span className="rounded-full border border-[color-mix(in_srgb,var(--accent)_38%,var(--border))] bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            OCR
          </span>
        </div>
        <p className={cn("mt-1 font-semibold leading-none text-[var(--foreground)]", styles.title)}>
          Corretor <span className="text-[var(--accent)]">de Provas</span>
        </p>
        <div className="mt-2 flex items-center gap-2">
          <ScanSearch className="size-4 text-[var(--accent)]" />
          <p className={cn("leading-5 text-[var(--muted-foreground)]", styles.subtitle)}>
            Correção inteligente para professores
          </p>
        </div>
      </div>
    </div>
  );
}
