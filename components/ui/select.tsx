"use client";

import { Children, isValidElement, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type FocusEvent, type ReactNode, type SelectHTMLAttributes } from "react";
import { Check, ChevronDown, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & { children: ReactNode };
type Option = { value: string; label: string; disabled: boolean };

function getOptions(children: ReactNode) {
  const options: Option[] = [];

  const visit = (nodes: ReactNode) => Children.forEach(nodes, (node) => {
    if (!isValidElement<{ children?: ReactNode; disabled?: boolean; label?: string; value?: string }>(node)) return;
    if (node.type === "option") {
      options.push({
        value: node.props.value ?? "",
        label: node.props.label ?? String(node.props.children ?? ""),
        disabled: Boolean(node.props.disabled),
      });
      return;
    }
    visit(node.props.children);
  });

  visit(children);
  return options;
}

function TeacherSelect({ children, className, value, onChange, disabled, ...props }: SelectProps) {
  const root = useRef<HTMLDivElement>(null);
  const nativeSelect = useRef<HTMLSelectElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const options = useMemo(() => getOptions(children), [children]);
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

function StyledSelect({ children, className, value, onChange, disabled, ...props }: SelectProps) {
  const root = useRef<HTMLDivElement>(null);
  const nativeSelect = useRef<HTMLSelectElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const options = useMemo(() => getOptions(children), [children]);
  const selectedValue = typeof value === "string" ? value : "";
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === selectedValue));
  const selected = options[selectedIndex];

  const focusOption = (index: number) => {
    const enabledIndexes = options.flatMap((option, optionIndex) => option.disabled ? [] : [optionIndex]);
    if (!enabledIndexes.length) return;
    const currentPosition = enabledIndexes.findIndex((optionIndex) => optionIndex === index);
    optionRefs.current[enabledIndexes[(currentPosition + enabledIndexes.length) % enabledIndexes.length] || 0]?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    window.addEventListener("pointerdown", closeOnOutside);
    return () => window.removeEventListener("pointerdown", closeOnOutside);
  }, [open]);

  const choose = (nextValue: string) => {
    if (options.find((option) => option.value === nextValue)?.disabled) return;
    onChange?.({ target: { value: nextValue } } as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  };

  const openOptions = (direction?: 1 | -1) => {
    setOpen(true);
    window.requestAnimationFrame(() => focusOption(direction ? selectedIndex + direction : selectedIndex));
  };

  return (
    <div
      ref={root}
      className={cn("app-select", className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        props.onBlur?.(event as unknown as FocusEvent<HTMLSelectElement>);
      }}
    >
      <select ref={nativeSelect} aria-hidden="true" tabIndex={-1} name={props.name} required={props.required} value={selectedValue} onChange={() => undefined} className="sr-only">{children}</select>
      <button
        id={props.id}
        type="button"
        disabled={disabled}
        aria-controls={listboxId}
        aria-describedby={props["aria-describedby"]}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={props["aria-label"]}
        className="app-select__trigger"
        onFocus={props.onFocus as unknown as React.FocusEventHandler<HTMLButtonElement>}
        onClick={() => open ? setOpen(false) : openOptions()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); openOptions(1); }
          if (event.key === "ArrowUp") { event.preventDefault(); openOptions(-1); }
          if (event.key === "Home") { event.preventDefault(); openOptions(); window.requestAnimationFrame(() => focusOption(0)); }
          if (event.key === "End") { event.preventDefault(); openOptions(); window.requestAnimationFrame(() => focusOption(options.length - 1)); }
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <span className="app-select__value">{selected?.label || options[0]?.label || "Selecionar opção"}</span>
        <ChevronDown aria-hidden="true" className={cn("app-select__chevron", open && "app-select__chevron--open")} />
      </button>
      {open ? <div id={listboxId} role="listbox" aria-label={props["aria-label"] || "Opções disponíveis"} className="app-select__panel">{options.map((option, index) => {
        const isSelected = option.value === selectedValue;
        return <button key={option.value || `empty-${index}`} ref={(element) => { optionRefs.current[index] = element; }} type="button" role="option" aria-selected={isSelected} aria-disabled={option.disabled || undefined} disabled={option.disabled} className={cn("app-select__option", isSelected && "app-select__option--selected")} onClick={() => choose(option.value)} onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); focusOption(index + 1); }
          if (event.key === "ArrowUp") { event.preventDefault(); focusOption(index - 1); }
          if (event.key === "Home") { event.preventDefault(); focusOption(0); }
          if (event.key === "End") { event.preventDefault(); focusOption(options.length - 1); }
          if (event.key === "Escape") { event.preventDefault(); setOpen(false); root.current?.querySelector<HTMLButtonElement>(".app-select__trigger")?.focus(); }
          if (event.key === "Tab") setOpen(false);
        }}><span className="app-select__option-label">{option.label}</span><span className="app-select__check" aria-hidden="true"><Check className="size-3.5" /></span></button>;
      })}</div> : null}
    </div>
  );
}

export function Select({ children, className, ...props }: SelectProps) {
  const isTeacherAssignment = typeof props["aria-label"] === "string" && props["aria-label"].startsWith("Professor que receberá");
  if (isTeacherAssignment) return <TeacherSelect className={className} {...props}>{children}</TeacherSelect>;

  return <StyledSelect className={className} {...props}>{children}</StyledSelect>;
}
