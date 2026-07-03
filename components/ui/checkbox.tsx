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
          backgroundColor: checked ? "rgba(96, 165, 250, 0.18)" : "rgba(255, 255, 255, 0.02)",
          borderColor: checked ? "rgba(96, 165, 250, 0.72)" : "rgba(148, 163, 184, 0.18)",
          boxShadow: checked
            ? "0 0 0 4px rgba(59, 130, 246, 0.14), 0 10px 24px rgba(37, 99, 235, 0.18)"
            : "0 8px 18px rgba(15, 23, 42, 0.18)",
        }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-[9px] border backdrop-blur-sm transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent)]/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-transparent group-hover:border-[var(--border-strong)]",
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
          <Check className="size-3.5 text-[var(--accent)]" strokeWidth={3} />
        </motion.span>
      </motion.span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
