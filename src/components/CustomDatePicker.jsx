import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { getLocalDateKey } from "../utils/date";
import Tooltip from "./Tooltip";

function parseDateKey(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftMonth(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export default function CustomDatePicker({ value, max, disabled, onChange }) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = parseDateKey(value);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [focusDate, setFocusDate] = useState(value);
  const pickerRef = useRef(null);
  const gridRef = useRef(null);
  const maxDate = useMemo(() => parseDateKey(max), [max]);

  useEffect(() => {
    const date = parseDateKey(value);
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setFocusDate(value);
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!pickerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    gridRef.current
      ?.querySelector(`[data-date="${focusDate}"]`)
      ?.focus({ preventScroll: true });
  }, [focusDate, open, visibleMonth]);

  const calendarDays = useMemo(() => {
    const first = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      1,
    );
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [visibleMonth]);

  const monthLabel = visibleMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const maxMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  const nextMonthDisabled = shiftMonth(visibleMonth, 1) > maxMonth;
  const todayKey = getLocalDateKey();

  const moveFocus = (date, amount) => {
    const target = new Date(date);
    target.setDate(target.getDate() + amount);
    const targetKey = formatDateKey(target);
    if (targetKey > max) return;
    setFocusDate(targetKey);
    setVisibleMonth(new Date(target.getFullYear(), target.getMonth(), 1));
  };

  const moveMonth = (amount) => {
    const targetMonth = shiftMonth(visibleMonth, amount);
    const nextFocus = parseDateKey(focusDate);
    const targetDate = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      Math.min(nextFocus.getDate(), new Date(
        targetMonth.getFullYear(),
        targetMonth.getMonth() + 1,
        0,
      ).getDate()),
    );
    if (formatDateKey(targetMonth) > max) return;
    setVisibleMonth(targetMonth);
    setFocusDate(formatDateKey(targetDate));
  };

  const chooseDate = async (dateKey) => {
    if (dateKey === value) {
      setOpen(false);
      return;
    }
    if (await onChange(dateKey)) setOpen(false);
  };

  return (
    <div className="custom-date-picker" ref={pickerRef}>
      <Tooltip label="Choose a date">
        <button
          type="button"
          className="custom-date-trigger"
          aria-label={`Choose date, currently ${parseDateKey(value).toLocaleDateString()}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
        >
          <CalendarDays size={15} aria-hidden="true" />
          <span>
            {parseDateKey(value).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </button>
      </Tooltip>
      {open && (
        <section
          className="custom-calendar"
          role="dialog"
          aria-label="Choose log date"
        >
          <header className="custom-calendar-header">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => moveMonth(-1)}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <strong aria-live="polite">{monthLabel}</strong>
            <button
              type="button"
              aria-label="Next month"
              disabled={nextMonthDisabled}
              onClick={() => moveMonth(1)}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </header>
          <div className="custom-calendar-grid" ref={gridRef}>
            <div className="custom-calendar-row" aria-hidden="true">
              {Array.from({ length: 7 }, (_, index) => {
                const date = new Date(2024, 0, 7 + index);
                return (
                  <span className="custom-calendar-weekday" key={index}>
                    {date.toLocaleDateString(undefined, { weekday: "narrow" })}
                  </span>
                );
              })}
            </div>
            {Array.from({ length: 6 }, (_, weekIndex) => (
              <div className="custom-calendar-row" key={weekIndex}>
                {calendarDays
                  .slice(weekIndex * 7, weekIndex * 7 + 7)
                  .map((date) => {
                    const dateKey = formatDateKey(date);
                    const outOfMonth = date.getMonth() !== visibleMonth.getMonth();
                    const isSelected = dateKey === value;
                    const isToday = dateKey === todayKey;
                    const isFuture = dateKey > max;
                    return (
                      <button
                        type="button"
                        key={dateKey}
                        data-date={dateKey}
                        tabIndex={dateKey === focusDate ? 0 : -1}
                        disabled={isFuture}
                        aria-label={date.toLocaleDateString(undefined, {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                        aria-current={isToday ? "date" : undefined}
                        aria-pressed={isSelected}
                        className={[
                          "custom-calendar-day",
                          outOfMonth && "outside-month",
                          isSelected && "selected",
                          isToday && "today",
                        ].filter(Boolean).join(" ")}
                        onFocus={() => setFocusDate(dateKey)}
                        onClick={() => {
                          void chooseDate(dateKey);
                        }}
                        onKeyDown={(event) => {
                          const offsets = {
                            ArrowLeft: -1,
                            ArrowRight: 1,
                            ArrowUp: -7,
                            ArrowDown: 7,
                          };
                          const offset = offsets[event.key];
                          if (offset) {
                            event.preventDefault();
                            moveFocus(date, offset);
                          } else if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            void chooseDate(dateKey);
                          }
                        }}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
          <footer className="custom-calendar-footer">
            <span>{parseDateKey(value).toLocaleDateString()}</span>
            <button
              type="button"
              disabled={value === todayKey}
              onClick={() => {
                void chooseDate(todayKey);
              }}
            >
              Today
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}
