"use client";

import { useState, useRef, useEffect } from "react";

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatShortDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatMonthYear(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getDaysInMonth(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: Date[] = [];
  const startPad = first.getDay();
  for (let i = 0; i < startPad; i++) {
    days.push(new Date(0));
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

export interface DateCalendarPickerProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  maxDate?: Date;
  minDate?: Date;
  className?: string;
}

export function DateCalendarPicker({
  selectedDate,
  onSelectDate,
  maxDate,
  minDate,
  className = "",
}: DateCalendarPickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth())
  );
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isToday = dateKey(selectedDate) === dateKey(new Date());

  useEffect(() => {
    if (!open) return;
    setViewMonth(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth())
    );
  }, [open, selectedDate]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  const goPrevMonth = () => {
    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  };

  const goNextMonth = () => {
    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1));
  };

  const handleSelectDay = (d: Date) => {
    if (d.getTime() === 0) return;
    const dateKeyVal = dateKey(d);
    if (maxDate && dateKeyVal > dateKey(maxDate)) return;
    if (minDate && dateKeyVal < dateKey(minDate)) return;
    onSelectDate(d);
    setOpen(false);
  };

  const days = getDaysInMonth(viewMonth.getFullYear(), viewMonth.getMonth());

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 sm:gap-2 rounded px-1 py-0.5 hover:bg-aged/50 transition-colors text-left"
        aria-label="Open calendar"
        aria-expanded={open}
      >
        <span className="font-heading text-base sm:text-xl font-bold text-ink">
          {formatShortDate(selectedDate)}
        </span>
        {isToday && (
          <span className="text-xs sm:text-sm font-normal text-rust">
            Today
          </span>
        )}
        <span className="text-ink/40 text-xs" aria-hidden>
          ▼
        </span>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-2 min-w-[280px] rounded-lg border-2 border-leather/30 bg-white p-4 shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-label="Calendar"
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={goPrevMonth}
              className="rounded p-1.5 text-ink/70 hover:bg-aged/50 hover:text-ink"
              aria-label="Previous month"
            >
              ←
            </button>
            <span className="font-heading text-sm font-bold text-ink">
              {formatMonthYear(viewMonth)}
            </span>
            <button
              type="button"
              onClick={goNextMonth}
              className="rounded p-1.5 text-ink/70 hover:bg-aged/50 hover:text-ink"
              aria-label="Next month"
            >
              →
            </button>
          </div>

          <div
            className="grid gap-x-2 gap-y-1.5"
            style={{ gridTemplateColumns: "repeat(7, 2.25rem)" }}
          >
            {DAY_NAMES.map((name) => (
              <span
                key={name}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center text-xs font-medium text-ink/50"
              >
                {name}
              </span>
            ))}
            {days.map((d, i) => {
              const isEmpty = d.getTime() === 0;
              const key = isEmpty ? `pad-${i}` : dateKey(d);
              const isSelected =
                !isEmpty && dateKey(d) === dateKey(selectedDate);
              const isTodayDate = !isEmpty && dateKey(d) === dateKey(new Date());
              const isDisabled =
                !isEmpty &&
                ((maxDate && dateKey(d) > dateKey(maxDate)) ||
                  (minDate && dateKey(d) < dateKey(minDate)));

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectDay(d)}
                  disabled={isEmpty || isDisabled}
                  className={`
                    flex h-9 w-9 flex-shrink-0 items-center justify-center rounded text-sm font-mono tabular-nums
                    ${isEmpty ? "invisible" : ""}
                    ${isDisabled ? "text-ink/30 cursor-not-allowed" : "hover:bg-aged/50"}
                    ${isSelected ? "bg-rust text-white hover:bg-rust/90" : ""}
                    ${!isSelected && isTodayDate ? "ring-1 ring-rust/50 text-rust" : ""}
                    ${!isSelected && !isTodayDate && !isDisabled ? "text-ink" : ""}
                  `}
                >
                  {isEmpty ? "" : d.getDate()}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              onSelectDate(new Date());
              setOpen(false);
            }}
            className="mt-3 w-full rounded bg-aged/30 py-1.5 text-xs font-medium text-ink hover:bg-aged/50"
          >
            Go to today
          </button>
        </div>
      )}
    </div>
  );
}
