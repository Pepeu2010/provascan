"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] border border-transparent text-base font-bold transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 ease-[var(--motion-settle)] hover:border-[var(--accent-strong)] hover:shadow-[0_0_0_3px_var(--focus-ring)] focus-visible:border-[var(--accent-strong)] focus-visible:shadow-[0_0_0_3px_var(--focus-ring)] active:scale-[0.985] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transform-none",
  {
    variants: {
      variant: {
        primary: "bg-[var(--accent)] px-5 py-3 text-[var(--accent-contrast)] shadow-[var(--shadow-soft)] hover:bg-[var(--accent-strong)] hover:shadow-[var(--shadow-floating)]",
        secondary:
          "border-[var(--border-strong)] bg-[var(--card-solid)] px-5 py-3 text-[var(--foreground)] hover:border-[var(--accent)] hover:bg-[var(--surface)]",
        ghost:
          "bg-transparent px-4 py-3 text-[var(--foreground)] shadow-none hover:bg-[var(--surface)]",
        danger: "bg-[var(--error)] px-5 py-3 text-white shadow-[var(--shadow-soft)] hover:brightness-95",
      },
      size: {
        default: "min-h-12 px-5", lg: "min-h-14 px-6 text-[17px]", icon: "size-12 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean; loading?: boolean; }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ asChild = false, className, variant, size, children, loading = false, disabled, ...props }, ref) => {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (asChild && React.isValidElement<{ className?: string }>(children)) return React.cloneElement(children, { className: cn(classes, children.props.className) });
  return <button aria-busy={loading || undefined} className={classes} disabled={disabled || loading} ref={ref} {...props}><span className="inline-flex items-center gap-2">{loading ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : null}{children}</span></button>;
});
Button.displayName = "Button";

export { Button, buttonVariants };
