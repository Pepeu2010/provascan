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
        className="h-11 w-full appearance-none rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--input-bg)] px-3.5 pr-11 text-sm font-medium text-[var(--foreground)] transition-[border-color,box-shadow,background-color] duration-200 hover:border-[var(--border-strong)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
    </div>
  );
}
