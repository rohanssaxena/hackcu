import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function MiniCalendar({ value, onChange, minDate, maxDate }) {
  const [viewDate, setViewDate] = useState(() => {
    const d = value ? new Date(value) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = useMemo(() => {
    const pad = firstDay;
    const cells = [];
    for (let i = 0; i < pad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [firstDay, daysInMonth]);

  const selectedDate = value ? new Date(value) : null;
  const selectedY = selectedDate?.getFullYear();
  const selectedM = selectedDate?.getMonth();
  const selectedD = selectedDate?.getDate();

  const isDisabled = (d) => {
    if (!d) return true;
    const cellDate = new Date(year, month, d);
    if (minDate && cellDate < new Date(minDate)) return true;
    if (maxDate && cellDate > new Date(maxDate)) return true;
    return false;
  };

  const isSelected = (d) =>
    d && year === selectedY && month === selectedM && d === selectedD;

  const handleSelect = (d) => {
    if (!d || isDisabled(d)) return;
    const dte = new Date(year, month, d);
    onChange(dte.toISOString().slice(0, 10));
  };

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const years = Array.from({ length: 12 }, (_, i) => year - 5 + i);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border-default bg-bg-elevated p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <select
            value={month}
            onChange={(e) =>
              setViewDate(new Date(year, parseInt(e.target.value, 10), 1))
            }
            className="cursor-pointer rounded border-0 bg-transparent font-sans text-[12px] font-medium text-text-primary focus:outline-none focus:ring-0"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) =>
              setViewDate(new Date(parseInt(e.target.value, 10), month, 1))
            }
            className="cursor-pointer rounded border-0 bg-transparent font-sans text-[12px] font-medium text-text-primary focus:outline-none focus:ring-0"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded p-1 text-text-faint transition-colors hover:bg-bg-hover hover:text-text-primary"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded p-1 text-text-faint transition-colors hover:bg-bg-hover hover:text-text-primary"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div
            key={d}
            className="py-1 text-center font-sans text-[10px] font-medium text-text-faint"
          >
            {d}
          </div>
        ))}
        {days.map((d, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSelect(d)}
            disabled={isDisabled(d)}
            className={`rounded py-1 font-sans text-[11px] transition-colors ${
              !d
                ? "invisible"
                : isDisabled(d)
                  ? "cursor-not-allowed text-text-faint/40"
                  : isSelected(d)
                    ? "bg-accent-blue text-white"
                    : "text-text-primary hover:bg-bg-hover"
            }`}
          >
            {d || ""}
          </button>
        ))}
      </div>
    </div>
  );
}
