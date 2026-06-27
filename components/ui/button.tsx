"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--accent)] px-4 py-2.5 text-[var(--accent-contrast)] shadow-[var(--shadow-soft)] hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]",
        secondary:
          "border border-[var(--border)] bg-[var(--card-solid)] px-4 py-2.5 text-[var(--foreground)] hover:bg-[var(--surface)]",
        ghost:
          "px-3 py-2 text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
      },
      size: {
        default: "",
        lg: "px-5 py-3 text-[15px]",
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
