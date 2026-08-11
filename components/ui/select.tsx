"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode, type SelectHTMLAttributes } from "react";
import { Check, ChevronDown, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  children: ReactNode;
};

type Option = { value: string; label: string; disabled: boolean };

function TeacherSelect({ children, className, value, onChange, disabled, ...props }: SelectProps) {
  const root = useRef<HTMLDivElement>(null);
  const nativeSelect = useRef<HTMLSelectElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const selectedValue = typeof value === "string" ? value : "";
  const selected = options.find((option) => option.value === selectedValue);
  const filtered = options.filter((option) => option.label.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));

  useEffect(() => {
    setOptions(Array.from(nativeSelect.current?.options ?? []).map((option) => ({ value: option.value, label: option.text, disabled: option.disabled })));
  }, [children]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("pointerdown", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => { window.removeEventListener("pointerdown", closeOnOutside); window.removeEventListener("keydown", closeOnEscape); };
  }, [open]);

  const choose = (nextValue: string) => {
    if (options.find((option) => option.value === nextValue)?.disabled) return;
    onChange?.({ target: { value: nextValue } } as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
    setQuery("");
  };

  return <div ref={root} className={cn("teacher-select", className)}>
    <select ref={nativeSelect} aria-hidden="true" tabIndex={-1} value={selectedValue} onChange={() => undefined} className="sr-only">{children}</select>
    <button type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={props["aria-label"]} onClick={() => setOpen((current) => !current)} className="teacher-select__trigger"><UserRound aria-hidden="true" className="size-4" /><span>{selected?.label || options[0]?.label || "Selecionar professor"}</span><ChevronDown aria-hidden="true" className="size-4" /></button>
    {open ? <div className="teacher-select__panel"><div className="teacher-select__search"><Search aria-hidden="true" className="size-4" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar professor" aria-label="Buscar professor" /></div><div role="listbox" aria-label="Professores disponíveis" className="teacher-select__options">{filtered.map((option) => <button key={option.value || "empty"} type="button" role="option" aria-selected={option.value === selectedValue} aria-disabled={option.disabled || undefined} disabled={option.disabled} onClick={() => choose(option.value)} className={cn("teacher-select__option", option.value === selectedValue && "teacher-select__option--selected", option.disabled && "teacher-select__option--disabled")}><span>{option.label}</span>{option.value === selectedValue ? <Check aria-hidden="true" className="size-4" /> : option.disabled ? <span className="text-xs">Atribuído</span> : null}</button>)}{!filtered.length ? <p className="teacher-select__empty">Nenhum professor encontrado.</p> : null}</div></div> : null}
  </div>;
}

export function Select({ children, className, ...props }: SelectProps) {
  const isTeacherAssignment = typeof props["aria-label"] === "string" && props["aria-label"].startsWith("Professor que receberá");
  if (isTeacherAssignment) return <TeacherSelect className={className} {...props}>{children}</TeacherSelect>;

  return (
    <div className={cn("relative", className)}>
      <select {...props} className="h-11 w-full appearance-none rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--input-bg)] px-3.5 pr-11 text-sm font-medium text-[var(--foreground)] transition-[border-color,box-shadow,background-color] duration-200 hover:border-[var(--border-strong)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60">{children}</select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
    </div>
  );
}
