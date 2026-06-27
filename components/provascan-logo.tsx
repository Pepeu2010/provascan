import { Check, Circle, ScanSearch } from "lucide-react";
import { cn } from "@/lib/utils";

type ProvaScanLogoProps = {
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
        "relative isolate overflow-hidden border border-white/10 bg-[radial-gradient(circle_at_top,#36d7ff55,transparent_42%),linear-gradient(145deg,#102247,#091327_74%)] shadow-[0_20px_45px_rgba(5,10,28,0.45)]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,transparent_62%,rgba(24,198,255,0.14)_100%)]" />
      <div className="absolute left-[14%] top-[14%] size-[28%] rounded-tl-[16px] border-l-2 border-t-2 border-[#2dbdff]" />
      <div className="absolute right-[14%] top-[14%] size-[28%] rounded-tr-[16px] border-r-2 border-t-2 border-[#2dbdff]" />
      <div className="absolute bottom-[14%] left-[14%] size-[28%] rounded-bl-[16px] border-b-2 border-l-2 border-[#2a73ff]" />
      <div className="absolute bottom-[14%] right-[14%] size-[28%] rounded-br-[16px] border-b-2 border-r-2 border-[#2a73ff]" />

      <div className="absolute left-[18%] top-[20%] h-[56%] w-[42%] rounded-[18px] border border-white/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(231,240,255,0.92))] shadow-[inset_-10px_-10px_20px_rgba(120,149,211,0.12),0_16px_24px_rgba(0,0,0,0.18)]" />
      <div className="absolute left-[48%] top-[20%] h-[22%] w-[12%] rounded-bl-[18px] bg-[linear-gradient(180deg,#2ae0ff,#2b63ff)] shadow-[-8px_10px_18px_rgba(36,110,255,0.28)]" />

      <div className="absolute left-[24%] top-[31%] flex items-center gap-[7%]">
        <Circle className="size-[16%] text-slate-400" strokeWidth={1.8} />
        <div className="flex gap-[8%]">
          <span className="block size-[10%] rounded-full border border-slate-300 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.45)]" />
          <span className="block size-[10%] rounded-full border border-slate-300 bg-white/70" />
          <span className="block size-[10%] rounded-full border border-slate-300 bg-white/70" />
        </div>
      </div>
      <div className="absolute left-[24%] top-[46%] flex items-center gap-[7%]">
        <Circle className="size-[16%] text-rose-400" strokeWidth={1.8} />
        <div className="flex gap-[8%]">
          <span className="block size-[10%] rounded-full border border-rose-300 bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.45)]" />
          <span className="block size-[10%] rounded-full border border-slate-300 bg-white/70" />
          <span className="block size-[10%] rounded-full border border-slate-300 bg-white/70" />
        </div>
      </div>
      <div className="absolute left-[24%] top-[61%] flex items-center gap-[7%]">
        <Circle className="size-[16%] text-slate-400" strokeWidth={1.8} />
        <div className="flex gap-[8%]">
          <span className="block size-[10%] rounded-full border border-slate-300 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.38)]" />
          <span className="block size-[10%] rounded-full border border-slate-300 bg-white/70" />
          <span className="block size-[10%] rounded-full border border-slate-300 bg-white/70" />
        </div>
      </div>

      <div className="absolute bottom-[16%] right-[12%] grid size-[42%] place-items-center rounded-full border border-cyan-300/40 bg-[radial-gradient(circle_at_top,#13234b,#08142e_76%)] shadow-[0_0_0_3px_rgba(33,115,255,0.18),0_18px_30px_rgba(8,17,40,0.45)]">
        <div className="grid size-[74%] place-items-center rounded-full bg-[linear-gradient(180deg,rgba(28,219,255,0.18),rgba(18,84,255,0.12))]">
          <Check className="size-[60%] text-cyan-300" strokeWidth={3.2} />
        </div>
      </div>
    </div>
  );
}

export function ProvaScanLogo({
  size = "md",
  variant = "full",
  className,
}: ProvaScanLogoProps) {
  const styles = sizeMap[size];

  if (variant === "sidebar") {
    return (
      <div
        className={cn(
          "flex items-center rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,26,49,0.98),rgba(12,22,42,0.94))] p-3.5 shadow-[var(--shadow-floating)]",
          styles.shell,
          className,
        )}
      >
        <LogoMark className={cn("shrink-0", styles.mark)} />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.36em] text-[#8fa6d8]">
            ProvaScan
          </p>
          <p className="mt-1 text-xl font-semibold leading-5 text-[var(--foreground)]">
            Corretor
          </p>
          <p className="text-xl font-semibold leading-5 text-[#39c6ff]">de Provas</p>
          <p className="mt-1.5 text-xs leading-5 text-[var(--muted-foreground)]">
            Correcao inteligente
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
          <span className={cn("font-mono uppercase tracking-[0.34em] text-[#8fa6d8]", styles.eyebrow)}>
            ProvaScan
          </span>
          <span className="rounded-full border border-cyan-400/35 bg-cyan-400/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
            OCR
          </span>
        </div>
        <p className={cn("mt-1 font-semibold leading-none text-[var(--foreground)]", styles.title)}>
          Corretor <span className="bg-[linear-gradient(135deg,#53b6ff,#27e1ff)] bg-clip-text text-transparent">de Provas</span>
        </p>
        <div className="mt-2 flex items-center gap-2">
          <ScanSearch className="size-4 text-cyan-300" />
          <p className={cn("leading-5 text-[var(--muted-foreground)]", styles.subtitle)}>
            Correcao inteligente para professores
          </p>
        </div>
      </div>
    </div>
  );
}
