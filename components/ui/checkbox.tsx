"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  wrapperClassName?: string;
};

export function Checkbox({
  checked = false,
  className,
  disabled,
  label,
  wrapperClassName,
  ...props
}: CheckboxProps) {
  return (
    <label
      className={cn(
        "group inline-flex cursor-pointer items-center gap-3 text-sm text-[var(--muted-foreground)]",
        disabled && "cursor-not-allowed opacity-60",
        wrapperClassName,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        className="peer sr-only"
        {...props}
      />
      <motion.span
        initial={false}
        animate={{
          backgroundColor: checked ? "var(--accent)" : "var(--input-bg)",
          borderColor: checked ? "var(--accent)" : "var(--border-strong)",
          boxShadow: checked ? "0 0 0 3px var(--focus-ring)" : "none",
        }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent)]/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-transparent group-hover:border-[var(--border-strong)]",
          className,
        )}
      >
        <motion.span
          initial={false}
          animate={{
            opacity: checked ? 1 : 0,
            scale: checked ? 1 : 0.72,
            y: checked ? 0 : 1.5,
          }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="flex items-center justify-center"
        >
          <Check className="size-3.5 text-[var(--accent-contrast)]" strokeWidth={3} />
        </motion.span>
      </motion.span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
