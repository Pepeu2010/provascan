"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { ChangeEvent, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children" | "onChange"> & {
  children: ReactNode;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
};

type SelectOption = {
  disabled: boolean;
  label: string;
  value: string;
};

function buildSyntheticEvent(value: string) {
  return {
    target: { value },
    currentTarget: { value },
  } as ChangeEvent<HTMLSelectElement>;
}

export function Select({ children, className, disabled, onChange, value, ...props }: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const options = useMemo<SelectOption[]>(
    () =>
      React.Children.toArray(children)
        .filter(React.isValidElement)
        .map((child) => {
          const optionProps = child.props as { children?: ReactNode; disabled?: boolean; value?: string };
          return {
            disabled: Boolean(optionProps.disabled),
            label: String(optionProps.children ?? ""),
            value: String(optionProps.value ?? ""),
          };
        }),
    [children],
  );
  const normalizedValue = String(value ?? "");
  const selected = options.find((item) => item.value === normalizedValue) ?? options[0] ?? null;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input type="hidden" value={selected?.value ?? ""} name={props.name} />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((previous) => !previous)}
        className="group relative flex h-12 w-full items-center justify-between rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--input-bg)_98%,transparent),color-mix(in_srgb,var(--surface)_88%,transparent))] px-4 pr-3 text-left text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-soft)] transition-[border-color,box-shadow,transform,background-color] duration-200 hover:-translate-y-[1px] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-floating)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_14%,transparent),var(--shadow-soft)] disabled:cursor-not-allowed disabled:opacity-60"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={selected ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>
          {selected?.label ?? "Selecione"}
        </span>
        <span className="flex size-8 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--border-strong)_72%,transparent)] bg-[color-mix(in_srgb,var(--surface-strong)_86%,transparent)] text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--foreground)]">
          <ChevronDown className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.55rem)] z-50 overflow-hidden rounded-[22px] border border-[color-mix(in_srgb,var(--border-strong)_82%,transparent)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-solid)_96%,transparent),color-mix(in_srgb,var(--surface)_94%,transparent))] p-2 shadow-[0_30px_70px_-34px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="max-h-72 overflow-y-auto pr-1">
            {options.map((option) => (
              <button
                key={`${option.value}-${option.label}`}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  if (option.disabled) {
                    return;
                  }
                  onChange?.(buildSyntheticEvent(option.value));
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition-colors duration-150",
                  option.disabled
                    ? "cursor-not-allowed opacity-45"
                    : option.value === normalizedValue
                      ? "bg-[var(--accent-soft)] text-[var(--foreground)]"
                      : "text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--surface-strong)_88%,transparent)]",
                ].join(" ")}
                role="option"
                aria-selected={option.value === normalizedValue}
              >
                <span className="pr-4">{option.label}</span>
                <span className={option.value === normalizedValue ? "text-[var(--accent)]" : "text-transparent"}>
                  <Check className="size-4" />
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
