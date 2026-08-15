"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpecularFrame } from "@/components/ui/specular-frame";

const buttonVariants = cva(
  "specular-button relative isolate inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap overflow-visible rounded-[var(--radius-sm)] border border-transparent text-sm font-semibold tracking-[-0.01em] transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 ease-[var(--motion-settle)] hover:border-[var(--accent-strong)] hover:shadow-[0_0_0_3px_var(--focus-ring)] focus-visible:border-[var(--accent-strong)] focus-visible:shadow-[0_0_0_3px_var(--focus-ring)] active:scale-[0.975] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transform-none",
  {
    variants: {
      variant: {
        primary: "bg-[var(--accent)] px-4 py-2.5 text-[var(--accent-contrast)] shadow-[var(--shadow-soft)] hover:bg-[var(--accent-strong)] hover:shadow-[var(--shadow-floating)]",
        secondary:
          "border-[var(--border)] bg-[var(--card-solid)] px-4 py-2.5 text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]",
        ghost:
          "bg-transparent px-3 py-2 text-[var(--muted-foreground)] shadow-none hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
        danger: "bg-[var(--error)] px-4 py-2.5 text-white shadow-[var(--shadow-soft)] hover:brightness-95",
      },
      size: {
        default: "h-11 px-4", lg: "h-12 px-5 text-[15px]", icon: "size-10 p-0",
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
  return <button data-specular aria-busy={loading || undefined} className={classes} disabled={disabled || loading} ref={ref} {...props}><SpecularFrame radius={size === "icon" ? 10 : 12} baseColor={variant === "danger" ? "#703847" : variant === "secondary" ? "#3d495a" : "#6c3fb4"} intensity={variant === "ghost" ? 0.55 : 1} /><span className="relative z-[2] inline-flex items-center gap-2">{loading ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}{children}</span></button>;
});
Button.displayName = "Button";

export { Button, buttonVariants };
