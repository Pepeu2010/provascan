import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "app-panel relative transition-[border-color,box-shadow,background-color] duration-200",
        className,
      )}
      {...props}
    />
  );
}
