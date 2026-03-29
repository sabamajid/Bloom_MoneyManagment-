"use client";

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { addMonthsUtc, formatUtcMonthKeyLong, formatUtcMonthKeyShort } from "@/lib/format";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

type Props = {
  viewMonth: string;
  todayUtc: string;
  selectedDay: string | null;
  onToggleDay: (dayKey: string) => void;
  onViewMonthChange: (monthKey: string) => void;
  dayTotals: ReadonlyMap<string, number>;
  /** Notifies parent when the popover opens/closes (for stacking above sibling lists). */
  onOpenChange?: (open: boolean) => void;
  /** Root wrapper (e.g. `flex-1 basis-0` for equal-width toolbar cells). */
  className?: string;
  classNameTrigger?: string;
};

function parseYm(monthKey: string): { y: number; m0: number } | null {
  const [yy, mm] = monthKey.split("-");
  const y = Number.parseInt(yy ?? "", 10);
  const m = Number.parseInt(mm ?? "", 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  return { y, m0: m - 1 };
}

function dayKey(y: number, m0: number, day: number) {
  const mo = `${m0 + 1}`.padStart(2, "0");
  const d = `${day}`.padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

export function ExpensesMiniCalendar({
  viewMonth,
  todayUtc,
  selectedDay,
  onToggleDay,
  onViewMonthChange,
  dayTotals,
  className,
  classNameTrigger,
  onOpenChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const parsed = parseYm(viewMonth);
  if (!parsed) return null;
  const { y, m0 } = parsed;

  const firstDow = new Date(Date.UTC(y, m0, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();

  const monthShort = formatUtcMonthKeyShort(viewMonth);
  const label = formatUtcMonthKeyLong(viewMonth);

  const cells: Array<{ key: string | null; inMonth: boolean }> = [];
  for (let i = 0; i < firstDow; i++) cells.push({ key: null, inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ key: dayKey(y, m0, d), inMonth: true });
  }
  while (cells.length % 7 !== 0) cells.push({ key: null, inMonth: false });

  function handlePickDay(dayKey: string) {
    onToggleDay(dayKey);
    setOpen(false);
  }

  function handleClearDay() {
    if (selectedDay) onToggleDay(selectedDay);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative min-w-0 w-full", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Pick a day to filter expenses"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-2xl border border-rose-100/90 bg-white/85 px-3 py-2.5 text-left text-sm shadow-sm ring-1 ring-black/[0.03] transition",
          "hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/80",
          open && "ring-2 ring-violet-200/70",
          classNameTrigger,
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/90 text-fuchsia-600 ring-1 ring-[var(--soft-ring)]">
            <CalendarDays className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold leading-snug text-ink">{monthShort}</span>
            <span className="mt-0.5 block text-xs leading-snug text-ink/55">
              {selectedDay ? `Day ${selectedDay.slice(8, 10)} · UTC` : "Whole month · UTC"}
            </span>
          </span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-ink/45 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Calendar"
          className="absolute right-0 top-[calc(100%+6px)] z-[100] w-[min(272px,calc(100vw-2rem))] rounded-2xl border border-rose-100/90 bg-white/95 p-2.5 shadow-[var(--soft-shadow)] ring-1 ring-black/[0.04] backdrop-blur-sm"
        >
          <div className="flex items-center justify-between gap-1 border-b border-rose-100/70 pb-2">
            <button
              type="button"
              aria-label="Previous month"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink/70 transition hover:bg-rose-50/80"
              onClick={() => onViewMonthChange(addMonthsUtc(viewMonth, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="min-w-0 flex-1 truncate text-center text-xs font-semibold text-ink">
              {label}
            </p>
            <button
              type="button"
              aria-label="Next month"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink/70 transition hover:bg-rose-50/80"
              onClick={() => onViewMonthChange(addMonthsUtc(viewMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-1.5 grid grid-cols-7 gap-px text-center text-[9px] font-semibold uppercase tracking-wide text-ink/40">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-0.5">
                {w}
              </div>
            ))}
          </div>

          <div className="mt-0.5 grid grid-cols-7 gap-px">
            {cells.map((cell, i) => {
              if (!cell.key) {
                return <div key={`e-${i}`} className="h-8" />;
              }
              const total = dayTotals.get(cell.key) ?? 0;
              const isToday = cell.key === todayUtc;
              const isSelected = cell.key === selectedDay;
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => handlePickDay(cell.key!)}
                  className={cn(
                    "relative flex h-8 items-center justify-center rounded-lg text-[11px] font-semibold transition",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/80",
                    isSelected
                      ? "bg-gradient-to-br from-rose-400/90 via-fuchsia-400/85 to-violet-400/90 text-white shadow-sm"
                      : isToday
                        ? "bg-white text-ink ring-1 ring-fuchsia-300/70"
                        : total > 0
                          ? "bg-rose-50/60 text-ink hover:bg-rose-50"
                          : "text-ink/40 hover:bg-white/80 hover:text-ink/70",
                  )}
                >
                  {Number(cell.key.slice(8, 10))}
                  {total > 0 && !isSelected ? (
                    <span className="absolute bottom-0.5 h-0.5 w-0.5 rounded-full bg-fuchsia-500" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {selectedDay ? (
            <button
              type="button"
              className="mt-2 w-full rounded-xl py-1.5 text-[11px] font-semibold text-fuchsia-700 ring-1 ring-fuchsia-200/80 transition hover:bg-fuchsia-50/80"
              onClick={handleClearDay}
            >
              Clear day filter
            </button>
          ) : (
            <p className="mt-2 text-center text-[10px] leading-snug text-ink/45">
              Tap a date to filter the list
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
