import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-32 w-full rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--input-bg)_96%,transparent),color-mix(in_srgb,var(--surface)_84%,transparent))] px-4 py-3 text-sm text-[var(--foreground)] shadow-[var(--shadow-soft)] outline-none placeholder:text-[var(--muted-foreground)] transition-[border-color,box-shadow,transform,background-color] duration-200 hover:-translate-y-[1px] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-floating)] focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_14%,transparent),var(--shadow-soft)]",
        className,
      )}
      {...props}
    />
  );
}
