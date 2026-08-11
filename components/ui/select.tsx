"use client";

import { Children, isValidElement, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode, type SelectHTMLAttributes } from "react";
import { Check, ChevronDown, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  children: ReactNode;
};

type Option = { value: string; label: string };

function TeacherSelect({ children, className, value, onChange, disabled, ...props }: SelectProps) {
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const options = useMemo<Option[]>(() => Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ value?: string; children?: ReactNode }>(child) || child.type !== "option") return [];
    return [{ value: child.props.value ?? "", label: String(child.props.children ?? "") }];
  }), [children]);
  const selectedValue = typeof value === "string" ? value : "";
  const selected = options.find((option) => option.value === selectedValue);
  const filtered = options.filter((option) => option.label.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("pointerdown", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => { window.removeEventListener("pointerdown", closeOnOutside); window.removeEventListener("keydown", closeOnEscape); };
  }, [open]);

  const choose = (nextValue: string) => {
    onChange?.({ target: { value: nextValue } } as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
    setQuery("");
  };

  return <div ref={root} className={cn("teacher-select", className)}>
    <button type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={props["aria-label"]} onClick={() => setOpen((current) => !current)} className="teacher-select__trigger"><UserRound aria-hidden="true" className="size-4" /><span>{selected?.label || options[0]?.label || "Selecionar professor"}</span><ChevronDown aria-hidden="true" className="size-4" /></button>
    {open ? <div className="teacher-select__panel"><div className="teacher-select__search"><Search aria-hidden="true" className="size-4" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar professor" aria-label="Buscar professor" /></div><div role="listbox" aria-label="Professores disponíveis" className="teacher-select__options">{filtered.map((option) => <button key={option.value || "empty"} type="button" role="option" aria-selected={option.value === selectedValue} onClick={() => choose(option.value)} className={cn("teacher-select__option", option.value === selectedValue && "teacher-select__option--selected")}><span>{option.label}</span>{option.value === selectedValue ? <Check aria-hidden="true" className="size-4" /> : null}</button>)}{!filtered.length ? <p className="teacher-select__empty">Nenhum professor encontrado.</p> : null}</div></div> : null}
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
