"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  children: ReactNode;
};

/**
 * Native select keeps the full keyboard and assistive-technology contract while
 * retaining the app visual language. Complex custom listboxes are not justified
 * for a data-entry workflow used daily by teachers.
 */
export function Select({ children, className, ...props }: SelectProps) {
  return (
    <div className={cn("relative", className)}>
      <select
        {...props}
        className="h-12 w-full appearance-none rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--input-bg)_98%,transparent),color-mix(in_srgb,var(--surface)_88%,transparent))] px-4 pr-11 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-soft)] transition-[border-color,box-shadow,transform,background-color] duration-200 hover:-translate-y-[1px] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-floating)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_14%,transparent),var(--shadow-soft)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
    </div>
  );
}
