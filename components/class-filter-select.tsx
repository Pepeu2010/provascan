"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, School } from "lucide-react";
import type { ClassRoom } from "@/types/domain";

type ClassFilterSelectProps = {
  classes: ClassRoom[];
  value: string;
  onChange: (value: string) => void;
};

const allClassesOption = { id: "all", nome: "Todas as salas" };

export function ClassFilterSelect({ classes, value, onChange }: ClassFilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const options = [allClassesOption, ...classes];
  const selectedOption = options.find((item) => item.id === value) ?? allClassesOption;

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  const focusOption = (index: number) => {
    const nextIndex = (index + options.length) % options.length;
    optionRefs.current[nextIndex]?.focus();
  };

  const choose = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
  };

  const openFromKeyboard = (direction: 1 | -1) => {
    const currentIndex = Math.max(0, options.findIndex((item) => item.id === value));
    setIsOpen(true);
    window.requestAnimationFrame(() => focusOption(currentIndex + direction));
  };

  return (
    <div
      ref={rootRef}
      className="relative min-w-[210px]"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
      }}
    >
      <button
        type="button"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex min-h-11 w-full items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--input-bg)] px-3 text-left text-sm font-semibold normal-case tracking-normal text-[var(--foreground)] transition-[border-color,box-shadow,background-color] duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--surface-strong)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--focus-ring)]"
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openFromKeyboard(1);
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            openFromKeyboard(-1);
          }
          if (event.key === "Escape") setIsOpen(false);
        }}
      >
        <School className="size-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{selectedOption.nome}</span>
        <ChevronDown className={`size-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Filtrar alunos por sala"
          className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--card-solid)] p-1.5 shadow-[var(--shadow-floating)]"
        >
          {options.map((option, index) => {
            const isSelected = value === option.id;
            return (
              <button
                key={option.id}
                ref={(element) => { optionRefs.current[index] = element; }}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`flex min-h-10 w-full items-center gap-2 rounded-[7px] px-2.5 text-left text-sm transition-colors duration-150 focus:outline-none focus:bg-[var(--accent-soft)] ${isSelected ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent-strong)]" : "text-[var(--foreground)] hover:bg-[var(--surface-strong)]"}`}
                onClick={() => choose(option.id)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    focusOption(index + 1);
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    focusOption(index - 1);
                  }
                  if (event.key === "Home") {
                    event.preventDefault();
                    focusOption(0);
                  }
                  if (event.key === "End") {
                    event.preventDefault();
                    focusOption(options.length - 1);
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setIsOpen(false);
                    rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
                  }
                }}
              >
                <span className={`grid size-5 place-items-center rounded-full border ${isSelected ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]" : "border-[var(--border-strong)] text-transparent"}`} aria-hidden="true">
                  <Check className="size-3" />
                </span>
                <span className="min-w-0 flex-1 truncate">{option.nome}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
