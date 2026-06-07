import { CalendarDays, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";

import { enumerateDateRange, getBookingCalendarRange } from "@/lib/slots";

type BookingCalendarProps = {
  today: string;
  selected: string;
  availability: Record<string, number>;
  loading: boolean;
  onSelect: (date: string) => void;
};

function dateAtUtc(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function dateLabel(date: string, today: string) {
  const tomorrow = new Date(`${today}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowValue = tomorrow.toISOString().slice(0, 10);
  if (date === today) return "Today";
  if (date === tomorrowValue) return "Tomorrow";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(dateAtUtc(date));
}

function dayLabel(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    timeZone: "UTC",
  }).format(dateAtUtc(date));
}

function accessibleLabel(date: string, availableSlots: number | undefined) {
  const label = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateAtUtc(date));
  if (availableSlots === 0) return `${label}, fully booked`;
  if (availableSlots === undefined) return label;
  return `${label}, ${availableSlots} slots available`;
}

export function BookingCalendar({
  today,
  selected,
  availability,
  loading,
  onSelect,
}: BookingCalendarProps) {
  const range = getBookingCalendarRange(today);
  const dates = enumerateDateRange(today, range.end);
  const selectedIndex = Math.max(0, dates.indexOf(selected));
  const start = Math.min(Math.max(0, selectedIndex - 2), Math.max(0, dates.length - 5));
  const visibleDates = dates.slice(start, start + 5);
  const previousDate = dates
    .slice(0, selectedIndex)
    .reverse()
    .find((date) => availability[date] !== 0);
  const nextDate = dates
    .slice(selectedIndex + 1)
    .find((date) => availability[date] !== 0);

  return (
    <section className="booking-step border-b border-slate-200">
      <div className="step-heading">
        <div className="flex items-center gap-2">
          <CalendarDays size={17} />
          <h2>1. Select Date</h2>
          <span className="hidden items-center gap-1 text-[11px] font-medium text-slate-400 sm:flex">
            {loading && <LoaderCircle size={11} className="animate-spin" />}
            {loading ? "Checking" : "Live availability"}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Previous date"
            disabled={!previousDate}
            onClick={() => previousDate && onSelect(previousDate)}
            className="date-arrow"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Next date"
            disabled={!nextDate}
            onClick={() => nextDate && onSelect(nextDate)}
            className="date-arrow"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {visibleDates.map((date) => {
          const count = availability[date];
          const full = count === 0;
          const low = count !== undefined && count < 3;
          const active = date === selected;
          return (
            <button
              type="button"
              key={date}
              disabled={full}
              aria-label={accessibleLabel(date, count)}
              aria-pressed={active}
              onClick={() => onSelect(date)}
              className={`relative min-w-0 rounded-xl border px-1 py-2 text-center transition sm:px-2 sm:py-3 ${
                active
                  ? "border-[#078a2f] bg-[#f1f8f2] text-[#05782b] shadow-[inset_0_0_0_1px_#078a2f]"
                  : full
                    ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                    : "border-slate-200 bg-white text-slate-950 hover:border-[#078a2f]"
              }`}
            >
              {low && !full && (
                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-amber-400" />
              )}
              <strong className="block truncate text-[9px] sm:text-xs">
                {dateLabel(date, today)}
              </strong>
              <span className="mt-0.5 block text-[9px] font-bold sm:text-xs">
                {dayLabel(date)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
