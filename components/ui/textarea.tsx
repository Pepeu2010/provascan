import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-32 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--input-bg)] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow,background-color] duration-200 hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--focus-ring)]",
        className,
      )}
      {...props}
    />
  );
}
