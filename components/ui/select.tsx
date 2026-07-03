"use client";

import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ children, className, ...props }: SelectProps) {
  return (
    <div className="group relative">
      <select
        className={cn(
          "h-12 w-full appearance-none rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--input-bg)_94%,transparent),color-mix(in_srgb,var(--surface)_84%,transparent))] px-4 pr-11 text-sm text-[var(--foreground)] shadow-[var(--shadow-soft)] outline-none transition-[border-color,box-shadow,transform,background-color] duration-200 hover:-translate-y-[1px] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-floating)] focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_14%,transparent),var(--shadow-soft)]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--foreground)]">
        <ChevronDown className="size-4" />
      </span>
    </div>
  );
}
