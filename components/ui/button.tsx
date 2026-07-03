"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-2xl border border-transparent text-sm font-semibold tracking-[-0.01em] shadow-[var(--shadow-soft)] transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent_48%)] before:opacity-60 after:pointer-events-none after:absolute after:inset-y-0 after:left-[-30%] after:w-1/3 after:-skew-x-12 after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)] after:opacity-0 after:transition-all after:duration-500 hover:after:left-[110%] hover:after:opacity-100 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent)_92%,white),var(--accent))] px-4 py-2.5 text-[var(--accent-contrast)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_70%,white)] hover:shadow-[var(--shadow-floating)] active:translate-y-0 active:shadow-[var(--shadow-soft)]",
        secondary:
          "border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-solid)_92%,transparent),color-mix(in_srgb,var(--surface)_72%,transparent))] px-4 py-2.5 text-[var(--foreground)] hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface)] hover:shadow-[var(--shadow-floating)] active:translate-y-0",
        ghost:
          "bg-transparent px-3 py-2 text-[var(--muted-foreground)] shadow-none before:hidden hover:bg-[color-mix(in_srgb,var(--surface)_72%,transparent)] hover:text-[var(--foreground)] active:bg-[var(--surface-strong)]",
        danger:
          "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--error)_94%,white),var(--error))] px-4 py-2.5 text-white hover:-translate-y-0.5 hover:shadow-[var(--shadow-floating)] active:translate-y-0",
      },
      size: {
        default: "h-11 px-4",
        lg: "h-12 px-5 text-[15px]",
        icon: "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      ref={ref}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
