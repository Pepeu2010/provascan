"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] border border-transparent text-sm font-semibold tracking-[-0.01em] transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--accent)] px-4 py-2.5 text-[var(--accent-contrast)] shadow-[var(--shadow-soft)] hover:bg-[var(--accent-strong)] hover:shadow-[var(--shadow-floating)]",
        secondary:
          "border-[var(--border)] bg-[var(--card-solid)] px-4 py-2.5 text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]",
        ghost:
          "bg-transparent px-3 py-2 text-[var(--muted-foreground)] shadow-none hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
        danger:
          "bg-[var(--error)] px-4 py-2.5 text-white shadow-[var(--shadow-soft)] hover:brightness-95",
      },
      size: {
        default: "h-11 px-4",
        lg: "h-12 px-5 text-[15px]",
        icon: "size-10 p-0",
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
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, className, variant, size, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size }), className);
    if (asChild && React.isValidElement<{ className?: string }>(children)) {
      return React.cloneElement(children, {
        className: cn(classes, children.props.className),
      });
    }

    return <button className={classes} ref={ref} {...props}>{children}</button>;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
