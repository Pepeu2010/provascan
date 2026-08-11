import type { ChangeEvent, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  if (props.type === "date") {
    const value = typeof props.value === "string" ? props.value : "";
    return (
      <DatePicker
        value={value}
        min={typeof props.min === "string" ? props.min : undefined}
        max={typeof props.max === "string" ? props.max : undefined}
        disabled={props.disabled}
        className={className}
        aria-label={props["aria-label"]}
        onChange={(nextValue) => props.onChange?.({ target: { value: nextValue } } as ChangeEvent<HTMLInputElement>)}
      />
    );
  }

  return (
    <input
      className={cn(
        "h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--input-bg)] px-3.5 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow,background-color] duration-200 hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--focus-ring)]",
        className,
      )}
      {...props}
    />
  );
}
