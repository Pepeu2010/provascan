import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-floating)] backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
