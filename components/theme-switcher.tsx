"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, ChevronDown, Laptop, Moon, SunMedium } from "lucide-react";
import { useAppTheme } from "@/components/providers";
import { type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => undefined;
const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof SunMedium;
}> = [
  {
    value: "light",
    label: "Tema claro",
    description: "Mais brilho e leitura limpa.",
    icon: SunMedium,
  },
  {
    value: "dark",
    label: "Tema escuro",
    description: "Visual elegante para longas sessões.",
    icon: Moon,
  },
  {
    value: "system",
    label: "Usar tema do sistema",
    description: "Acompanha a aparência do dispositivo.",
    icon: Laptop,
  },
];

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useAppTheme();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const displayTheme = mounted ? theme : "system";
  const activeOption =
    themeOptions.find((option) => option.value === displayTheme) ?? themeOptions[2];
  const ActiveIcon = activeOption.icon;

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex flex-col",
        open && "z-[120]",
        compact && "w-full",
      )}
    >
      <button
        type="button"
        aria-label="Selecionar tema"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
        className={cn(
          "group inline-flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-solid)] px-3 py-2 text-left text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-soft)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface)]",
          compact ? "w-full justify-between" : "min-w-[168px] justify-between",
          open && "border-[var(--accent)] bg-[var(--surface)]",
        )}
      >
        <span className="inline-flex min-w-0 items-center gap-3">
          <span className="inline-flex shrink-0 items-center gap-2">
            <ActiveIcon className="size-4 text-[var(--accent)]" />
            <span>Tema</span>
          </span>
          <span
            className={cn(
              "hidden h-8 w-px rounded-full bg-[var(--border)] sm:block",
              compact && "sm:hidden",
            )}
          />
          {compact ? (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                {activeOption.label}
              </span>
              <span className="block truncate text-xs text-[var(--muted-foreground)]">
                {activeOption.description}
              </span>
            </span>
          ) : (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                {activeOption.label}
              </span>
            </span>
          )}
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]",
              compact ? "hidden sm:inline-flex" : "inline-flex",
              open
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--muted-foreground)]",
            )}
          >
            {displayTheme}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-200",
              open && "rotate-180 text-[var(--accent)]",
            )}
          />
        </span>
      </button>

      {open ? (
        <div
          className={cn(
            "absolute top-[calc(100%+0.75rem)] z-[140] rounded-3xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card-solid)_92%,transparent)] p-2 shadow-[var(--shadow-floating)] backdrop-blur-xl",
            compact ? "left-0 right-0 w-full" : "right-0 w-[264px]",
          )}
        >
          <div className="mb-2 px-3 pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Aparência
            </p>
            <p className="mt-1 text-sm text-[var(--foreground)]">
              Escolha como o ProvaScan deve aparecer.
            </p>
          </div>
          <div className="grid gap-1">
            {themeOptions.map((option) => {
              const OptionIcon = option.icon;
              const isActive = option.value === displayTheme;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setTheme(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors",
                    isActive
                      ? "bg-[var(--accent-soft)] text-[var(--foreground)]"
                      : "text-[var(--foreground)] hover:bg-[var(--surface)]",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-2xl border",
                      isActive
                        ? "border-[var(--accent)] bg-[var(--card-solid)] text-[var(--accent)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)]",
                    )}
                  >
                    <OptionIcon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="block text-xs text-[var(--muted-foreground)]">
                      {option.description}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border transition-colors",
                      isActive
                        ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]"
                        : "border-[var(--border)] bg-transparent text-transparent",
                    )}
                  >
                    <Check className="size-3.5" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
