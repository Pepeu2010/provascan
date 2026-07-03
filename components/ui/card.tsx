import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass-panel relative rounded-[28px] border border-[var(--border)] bg-[var(--card)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_22%)] before:opacity-80 transition-[transform,border-color,box-shadow,background-color] duration-300",
        className,
      )}
      {...props}
    />
  );
}
