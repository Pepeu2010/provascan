"use client";

import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ children, className, ...props }: SelectProps) {
  return (
    <div className="group relative">
      <div className="pointer-events-none absolute inset-[1px] rounded-[15px] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-solid)_24%,transparent),transparent_72%)] opacity-70" />
      <select
        className={cn(
          "relative z-[1] h-12 w-full cursor-pointer appearance-none rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--input-bg)_98%,transparent),color-mix(in_srgb,var(--surface)_88%,transparent))] px-4 pr-12 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-soft)] outline-none transition-[border-color,box-shadow,transform,background-color] duration-200 hover:-translate-y-[1px] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-floating)] focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_14%,transparent),var(--shadow-soft)] disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        <span className="flex size-8 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--border-strong)_72%,transparent)] bg-[color-mix(in_srgb,var(--surface-strong)_86%,transparent)] text-[var(--muted-foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors group-hover:text-[var(--foreground)] group-focus-within:border-[var(--accent)] group-focus-within:text-[var(--accent)]">
          <ChevronDown className="size-4" />
        </span>
      </span>
    </div>
  );
}
