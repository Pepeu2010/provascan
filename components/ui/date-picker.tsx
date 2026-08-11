"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function fromIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? new Date(year, month - 1, day, 12)
    : new Date();
}

function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function DatePicker({ value, onChange, min, max, disabled = false, className, "aria-label": ariaLabel = "Selecionar data" }: DatePickerProps) {
  const container = useRef<HTMLDivElement>(null);
  const dialogId = useId();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => fromIso(value));
  const selected = fromIso(value);
  const today = toIso(new Date());
  const days = useMemo(() => monthDays(viewMonth), [viewMonth]);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(viewMonth);
  const fieldLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(selected);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const selectDate = (date: Date) => {
    const iso = toIso(date);
    if ((min && iso < min) || (max && iso > max)) return;
    onChange(iso);
    setViewMonth(date);
    setOpen(false);
  };

  return (
    <div ref={container} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={() => {
          setViewMonth(selected);
          setOpen((current) => !current);
        }}
        className="date-picker__trigger"
      >
        <CalendarDays aria-hidden="true" className="size-4" />
        <span>{fieldLabel}</span>
        <span className="date-picker__marker" aria-hidden="true">DATA</span>
      </button>
      {open ? (
        <div id={dialogId} role="dialog" aria-label="Calendário" className="date-picker__panel">
          <div className="date-picker__header">
            <div><p>Aplicação da prova</p><strong>{monthLabel}</strong></div>
            <div className="date-picker__navigation">
              <button type="button" aria-label="Mês anterior" onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1, 12))}><ChevronLeft className="size-4" /></button>
              <button type="button" aria-label="Próximo mês" onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1, 12))}><ChevronRight className="size-4" /></button>
            </div>
          </div>
          <div className="date-picker__weekdays" aria-hidden="true">{weekdayLabels.map((day) => <span key={day}>{day}</span>)}</div>
          <div className="date-picker__days">
            {days.map((day) => {
              const iso = toIso(day);
              const outsideMonth = day.getMonth() !== viewMonth.getMonth();
              const unavailable = Boolean((min && iso < min) || (max && iso > max));
              return <button key={iso} type="button" disabled={unavailable} onClick={() => selectDate(day)} className={cn("date-picker__day", outsideMonth && "date-picker__day--outside", iso === value && "date-picker__day--selected", iso === today && "date-picker__day--today")} aria-label={new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(day)} aria-pressed={iso === value}>{day.getDate()}</button>;
            })}
          </div>
          <div className="date-picker__footer"><button type="button" onClick={() => selectDate(new Date())}>Hoje</button><span>{fieldLabel}</span></div>
        </div>
      ) : null}
    </div>
  );
}
