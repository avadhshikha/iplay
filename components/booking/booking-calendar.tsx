import { CalendarDays, LoaderCircle } from "lucide-react";

import { enumerateDateRange, getBookingCalendarRange } from "@/lib/slots";

type BookingCalendarProps = {
  today: string;
  selected: string;
  availability: Record<string, number>;
  loading: boolean;
  onSelect: (date: string) => void;
};

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateAtUtc(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function monthLabel(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateAtUtc(date));
}

function dayLabel(date: string, availableSlots: number | undefined, past: boolean) {
  const label = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateAtUtc(date));

  if (past) return `${label}, past date`;
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
  const dates = enumerateDateRange(range.start, range.end);
  const months = Array.from(
    dates.reduce((grouped, date) => {
      const key = date.slice(0, 7);
      const values = grouped.get(key) ?? [];
      values.push(date);
      grouped.set(key, values);
      return grouped;
    }, new Map<string, string[]>()),
  );

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-700">Choose your date</p>
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          {loading ? <LoaderCircle size={13} className="animate-spin" /> : <CalendarDays size={13} />}
          {loading ? "Checking availability" : "Live availability"}
        </p>
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        {months.map(([month, monthDates]) => {
          const leadingDays = dateAtUtc(monthDates[0]).getUTCDay();
          return (
            <section
              key={month}
              className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
            >
              <h3 className="text-sm font-black text-green-950">
                {monthLabel(monthDates[0])}
              </h3>
              <div className="mt-3 grid grid-cols-7 gap-1 text-center">
                {weekDays.map((day) => (
                  <span
                    key={day}
                    className="pb-1 text-[9px] font-black uppercase tracking-wide text-slate-400"
                  >
                    {day}
                  </span>
                ))}
                {Array.from({ length: leadingDays }, (_, index) => (
                  <span key={`blank-${index}`} />
                ))}
                {monthDates.map((date) => {
                  const count = availability[date];
                  const past = date < today;
                  const full = count === 0;
                  const low = count !== undefined && count < 3;
                  const active = date === selected;
                  return (
                    <button
                      type="button"
                      key={date}
                      disabled={past || full}
                      aria-label={dayLabel(date, count, past)}
                      aria-pressed={active}
                      onClick={() => onSelect(date)}
                      className={`min-h-12 rounded-lg border px-1 py-1.5 text-xs font-black transition ${
                        active
                          ? "border-green-800 bg-green-700 text-white shadow-sm ring-2 ring-green-200"
                          : past || full
                            ? "cursor-not-allowed border-transparent bg-slate-100 text-slate-300"
                            : low
                              ? "border-amber-300 bg-amber-50 text-amber-950 hover:border-amber-500"
                              : "border-transparent bg-white text-green-950 hover:border-green-400"
                      }`}
                    >
                      <span className="block">{Number(date.slice(-2))}</span>
                      {low && !past && (
                        <span
                          className={`mt-0.5 block text-[8px] font-black uppercase tracking-tight ${
                            active ? "text-green-100" : full ? "text-slate-400" : "text-amber-700"
                          }`}
                        >
                          {full ? "Full" : `${count} left`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
