"use client";

import { Moon, SunMedium } from "lucide-react";
import { useAppTheme } from "@/components/providers";
import { cn } from "@/lib/utils";

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme, setTheme } = useAppTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "group inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card-solid)_88%,transparent)] px-1.5 py-1.5 shadow-[var(--shadow-soft)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface)]",
        compact ? "h-10 justify-center self-end" : "h-11 justify-center",
      )}
    >
      <span
        className={cn(
          "grid size-[30px] place-items-center rounded-xl transition-all",
          !isDark ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--muted-foreground)]",
        )}
      >
        <SunMedium className="size-4" />
      </span>
      <span className="h-4 w-px rounded-full bg-[var(--border)]" aria-hidden="true" />
      <span
        className={cn(
          "grid size-[30px] place-items-center rounded-xl transition-all",
          isDark ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--muted-foreground)]",
        )}
      >
        <Moon className="size-4" />
      </span>
    </button>
  );
}
