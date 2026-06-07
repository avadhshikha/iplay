"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  ContactRound,
  LoaderCircle,
  Mail,
  MessageSquareText,
  Phone,
  ReceiptIndianRupee,
  Smartphone,
  TicketCheck,
  UserRound,
} from "lucide-react";

import { BookingCalendar } from "@/components/booking/booking-calendar";
import { calculateBookingPrice, getHourlyRate } from "@/lib/pricing";
import {
  formatDuration,
  formatSlotLabel,
  getBookingCalendarRange,
  getEndTime,
  getIndiaNowParts,
} from "@/lib/slots";
import type {
  DateAvailability,
  PaymentMode,
  SlotAvailability,
} from "@/lib/types";

type FormState = {
  name: string;
  phone: string;
  email: string;
  notes: string;
  paymentMode: PaymentMode;
};

const initialForm: FormState = {
  name: "",
  phone: "",
  email: "",
  notes: "",
  paymentMode: "upi",
};

const presetTimes = ["09:30", "12:00", "16:00", "18:00"];
const durationChoices = [0.5, 1, 1.5, 2, 3, 4, 5];

async function fetchSlotsForDate(date: string) {
  const response = await fetch(`/api/slots?date=${date}`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Could not load slots.");
  return (payload.slots ?? []) as SlotAvailability[];
}

async function fetchDateAvailability(today: string, calendarEnd: string) {
  const response = await fetch(
    `/api/availability?from=${today}&to=${calendarEnd}`,
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Could not load date availability.");
  }
  const availability = (payload.availability ?? []) as DateAvailability[];
  return Object.fromEntries(
    availability.map((item) => [item.date, item.availableSlots]),
  );
}

function selectionForStart(
  slots: SlotAvailability[],
  startTime: string,
  preferredCount = 4,
) {
  const startIndex = slots.findIndex((slot) => slot.time === startTime);
  if (startIndex < 0 || !slots[startIndex].available) return [];
  let count = 0;
  while (
    count < preferredCount &&
    startIndex + count < slots.length &&
    slots[startIndex + count].available
  ) {
    count += 1;
  }
  return slots.slice(startIndex, startIndex + Math.max(1, count)).map((slot) => slot.time);
}

function defaultSelection(slots: SlotAvailability[]) {
  const preferredStart = slots.findIndex(
    (slot, index) =>
      slot.available &&
      slots.slice(index, index + 4).length === 4 &&
      slots.slice(index, index + 4).every((candidate) => candidate.available),
  );
  const fallbackStart = slots.findIndex((slot) => slot.available);
  const startIndex = preferredStart >= 0 ? preferredStart : fallbackStart;
  return startIndex >= 0 ? selectionForStart(slots, slots[startIndex].time, 4) : [];
}

function timeParts(time: string) {
  const [clock, period] = formatSlotLabel(time).split(" ");
  const [hour, minute] = clock.split(":");
  return { hour, minute, period: period.toLowerCase() };
}

export function BookingWizard() {
  const today = useMemo(() => getIndiaNowParts().date, []);
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [dateAvailability, setDateAvailability] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loadingDates, setLoadingDates] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const calendarEnd = useMemo(() => getBookingCalendarRange(today).end, [today]);

  useEffect(() => {
    let active = true;
    fetchSlotsForDate(date)
      .then((loadedSlots) => {
        if (active) {
          setSlots(loadedSlots);
          setSelected(defaultSelection(loadedSlots));
        }
      })
      .catch(() => {
        if (active) {
          setMessage("Could not load slots. Please try again.");
          setSlots([]);
          setSelected([]);
        }
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [date]);

  useEffect(() => {
    let active = true;
    fetchDateAvailability(today, calendarEnd)
      .then((availability) => {
        if (active) setDateAvailability(availability);
      })
      .catch(() => {
        if (active) setDateAvailability({});
      })
      .finally(() => {
        if (active) setLoadingDates(false);
      });
    return () => {
      active = false;
    };
  }, [calendarEnd, today]);

  async function refreshBookingData() {
    setLoadingSlots(true);
    setLoadingDates(true);
    const [loadedSlots, availability] = await Promise.allSettled([
      fetchSlotsForDate(date),
      fetchDateAvailability(today, calendarEnd),
    ]);
    if (loadedSlots.status === "fulfilled") {
      setSlots(loadedSlots.value);
      setSelected(defaultSelection(loadedSlots.value));
    } else {
      setSlots([]);
      setSelected([]);
    }
    if (availability.status === "fulfilled") {
      setDateAvailability(availability.value);
    }
    setLoadingSlots(false);
    setLoadingDates(false);
  }

  function chooseDate(nextDate: string) {
    if (!nextDate) return;
    setLoadingSlots(true);
    setDate(nextDate);
    setSelected([]);
    setSuccess(false);
    setMessage(null);
  }

  function selectStartTime(time: string) {
    const nextSelection = selectionForStart(slots, time, Math.max(1, selected.length || 4));
    if (nextSelection.length) setSelected(nextSelection);
  }

  function durationAvailable(durationHours: number) {
    const startIndex = slots.findIndex((slot) => slot.time === selected[0]);
    const slotCount = durationHours * 2;
    return (
      startIndex >= 0 &&
      startIndex + slotCount <= slots.length &&
      slots.slice(startIndex, startIndex + slotCount).every((slot) => slot.available)
    );
  }

  function chooseDuration(durationHours: number) {
    const startIndex = slots.findIndex((slot) => slot.time === selected[0]);
    setSelected(
      slots
        .slice(startIndex, startIndex + durationHours * 2)
        .map((slot) => slot.time),
    );
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer_name: form.name,
          customer_phone: form.phone,
          customer_email: form.email,
          booking_date: date,
          start_time: selected[0],
          duration_hours: selected.length / 2,
          payment_mode: form.paymentMode,
          notes: form.notes,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error ?? "Could not save your booking.");
        return;
      }

      setDateAvailability((current) => ({
        ...current,
        [date]: Math.max(
          0,
          (current[date] ?? slots.filter((slot) => slot.available).length) -
            selected.length,
        ),
      }));
      setSuccess(true);
    } catch {
      setMessage("Could not save your booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const durationHours = selected.length / 2;
  const total = selected.length ? calculateBookingPrice(date, durationHours) : 0;
  const startIndex = Math.max(0, slots.findIndex((slot) => slot.time === selected[0]));
  const wheelStart = Math.min(Math.max(0, startIndex - 2), Math.max(0, slots.length - 5));
  const wheelSlots = slots.slice(wheelStart, wheelStart + 5);

  return (
    <div className="min-h-full">
      <BookingCalendar
        today={today}
        selected={date}
        availability={dateAvailability}
        loading={loadingDates}
        onSelect={chooseDate}
      />

      <section className="booking-step border-b border-slate-200">
        <div className="step-heading">
          <div className="flex items-center gap-2">
            <Clock3 size={17} />
            <div>
              <h2>2. Select Time</h2>
              <p className="mt-0.5 text-[10px] font-bold text-[#078a2f] sm:text-xs">
                Choose your start time
              </p>
            </div>
          </div>
          <p className="hidden text-right text-[11px] leading-5 text-slate-500 sm:block">
            Starts from 9:30 AM
            <br />
            Last booking ends at 11:30 PM
          </p>
        </div>

        {loadingSlots ? (
          <div className="grid min-h-52 place-items-center text-[#078a2f]">
            <LoaderCircle className="animate-spin" />
          </div>
        ) : selected.length ? (
          <div className="mx-auto mt-3 max-w-xl">
            <div className="mx-auto grid max-w-sm gap-0.5 py-1">
              {wheelSlots.map((slot) => {
                const active = slot.time === selected[0];
                const parts = timeParts(slot.time);
                return (
                  <button
                    type="button"
                    key={slot.time}
                    disabled={!slot.available}
                    aria-pressed={active}
                    onClick={() => selectStartTime(slot.time)}
                    className={`grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3 rounded-xl px-7 py-1 text-center transition ${
                      active
                        ? "bg-gradient-to-r from-[#eff7f0] via-[#e6f3e8] to-[#eff7f0] text-[#078a2f]"
                        : slot.available
                          ? "text-slate-300 hover:bg-slate-50 hover:text-slate-500"
                          : "cursor-not-allowed text-slate-200"
                    }`}
                  >
                    <span />
                    <span className={active ? "text-xl font-black" : "text-sm font-semibold"}>
                      {parts.hour}
                    </span>
                    <span className={active ? "text-xl font-black" : "text-sm font-semibold"}>
                      :
                    </span>
                    <span className={active ? "text-xl font-black" : "text-sm font-semibold"}>
                      {parts.minute}
                    </span>
                    <span className={`text-left ${active ? "text-lg font-black" : "text-sm font-semibold"}`}>
                      {parts.period}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-[10px] font-black text-slate-800 sm:text-xs">Presets</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {presetTimes.map((time) => {
                const available = slots.find((slot) => slot.time === time)?.available;
                const active = selected[0] === time;
                return (
                  <button
                    type="button"
                    key={time}
                    disabled={!available}
                    onClick={() => selectStartTime(time)}
                    className={`rounded-lg border px-2 py-2 text-[10px] font-black transition sm:text-xs ${
                      active
                        ? "border-[#078a2f] bg-[#f1f8f2] text-[#078a2f]"
                        : available
                          ? "border-slate-200 bg-white text-slate-800 hover:border-[#078a2f]"
                          : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                    }`}
                  >
                    {formatSlotLabel(time).toLowerCase()}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() =>
                document.getElementById("duration-step")?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                })
              }
              className="mt-3 w-full rounded-lg bg-[#078d32] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#067a2b]"
            >
              Done
            </button>
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-slate-400">
            No start times are available for this date.
          </p>
        )}

        {selected.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-3 py-2.5 text-[10px] text-slate-600 sm:text-xs">
            <span className="flex items-center gap-2">
              <CalendarCheck2 size={14} className="text-slate-700" />
              Selected Start Time:
              <strong className="text-[#078a2f]">{formatSlotLabel(selected[0])}</strong>
            </span>
            <span className="hidden text-slate-400 sm:inline">→</span>
            <span>
              Booking Window:{" "}
              <strong className="text-[#078a2f]">
                {formatSlotLabel(selected[0])} –{" "}
                {formatSlotLabel(getEndTime(selected[0], durationHours))}
              </strong>{" "}
              ({formatDuration(durationHours)})
            </span>
          </div>
        )}
      </section>

      <section
        id="duration-step"
        className="booking-step duration-step border-b border-slate-200"
      >
        <StepTitle icon={Clock3} number="3" title="Select Duration" />
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {durationChoices.map((duration) => {
            const available = durationAvailable(duration);
            const active = durationHours === duration;
            return (
              <button
                type="button"
                key={duration}
                disabled={!available}
                onClick={() => chooseDuration(duration)}
                className={`rounded-lg border px-1 py-2 text-[9px] font-black transition sm:text-xs ${
                  active
                    ? "border-[#078a2f] bg-[#f1f8f2] text-[#078a2f] shadow-[inset_0_0_0_1px_#078a2f]"
                    : available
                      ? "border-slate-200 bg-white text-slate-800 hover:border-[#078a2f]"
                      : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                }`}
              >
                {formatDuration(duration)}
              </button>
            );
          })}
        </div>
      </section>

      <form onSubmit={submitBooking}>
        <div className="grid border-b border-slate-200 lg:grid-cols-2">
          <section className="booking-step border-b border-slate-200 lg:border-b-0 lg:border-r">
            <StepTitle icon={ReceiptIndianRupee} number="4" title="Price Summary" />
            <div className="mt-4 space-y-2 text-xs">
              <SummaryRow label="Slot Rate" value={`₹${getHourlyRate(date)}/hr`} />
              <SummaryRow label="Duration" value={formatDuration(durationHours || 0)} />
              <SummaryRow label="Payment" value={form.paymentMode.toUpperCase()} />
              <div className="my-2 border-t border-slate-200" />
              <SummaryRow label="Payable Amount" value={`₹${total}`} strong />
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#f0f8f1] px-3 py-2 text-[10px] font-semibold text-[#08772d]">
              <TicketCheck className="mt-0.5 shrink-0" size={14} />
              <span>
                Reserve online now.
                <span className="block font-medium">Pay at the venue by cash or UPI.</span>
              </span>
            </div>
          </section>

          <section className="booking-step">
            <StepTitle icon={ContactRound} number="5" title="Your Details" />
            <div className="mt-3 grid gap-2">
              <BookingField
                icon={UserRound}
                label="Full Name"
                value={form.name}
                onChange={(name) => setForm({ ...form, name })}
                minLength={2}
                required
              />
              <BookingField
                icon={Mail}
                label="Email (optional)"
                type="email"
                value={form.email}
                onChange={(email) => setForm({ ...form, email })}
              />
              <BookingField
                icon={Phone}
                label="WhatsApp Number"
                value={form.phone}
                onChange={(phone) => setForm({ ...form, phone })}
                pattern="[6-9][0-9]{9}"
                inputMode="numeric"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <PaymentChoice
                  active={form.paymentMode === "upi"}
                  icon={Smartphone}
                  label="UPI"
                  onClick={() => setForm({ ...form, paymentMode: "upi" })}
                />
                <PaymentChoice
                  active={form.paymentMode === "cash"}
                  icon={Banknote}
                  label="Cash"
                  onClick={() => setForm({ ...form, paymentMode: "cash" })}
                />
              </div>
              <label className="relative block">
                <span className="sr-only">Notes (optional)</span>
                <MessageSquareText
                  size={14}
                  className="pointer-events-none absolute left-3 top-2.5 text-slate-400"
                />
                <textarea
                  maxLength={200}
                  placeholder="Notes (optional)"
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  className="min-h-14 w-full resize-none rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-[#078a2f] focus:ring-2 focus:ring-green-100"
                />
              </label>
            </div>

            {message && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">
                {message}
              </p>
            )}

            <button
              disabled={!selected.length || submitting || success}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#078d32] px-4 py-3 text-xs font-black text-white transition hover:bg-[#067a2b] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting && <LoaderCircle size={15} className="animate-spin" />}
              {success ? "Booking confirmed" : `Confirm ₹${total} Booking`}
            </button>
          </section>
        </div>
      </form>

      {success && (
        <div className="booking-step">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-green-200 bg-[#f0f8f1] px-4 py-3 text-[#08772d]">
            <span className="flex gap-3">
              <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
              <span>
                <strong className="block text-xs">Booking Confirmed!</strong>
                <span className="mt-0.5 block text-[10px] font-medium">
                  Your turf slot has been booked successfully.
                </span>
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setForm(initialForm);
                void refreshBookingData();
              }}
              className="shrink-0 rounded-lg border border-green-200 bg-white px-3 py-2 text-[10px] font-black"
            >
              Book another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepTitle({
  icon: Icon,
  number,
  title,
}: {
  icon: typeof Clock3;
  number: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[#078a2f]">
      <Icon size={16} />
      <h2 className="text-xs font-black text-slate-950 sm:text-sm">
        {number}. {title}
      </h2>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${strong ? "font-black" : ""}`}>
      <span>{label}</span>
      <span className={strong ? "text-base text-[#078a2f]" : "font-bold text-slate-900"}>
        {value}
      </span>
    </div>
  );
}

function PaymentChoice({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Banknote;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-black transition ${
        active
          ? "border-[#078a2f] bg-[#f1f8f2] text-[#078a2f]"
          : "border-slate-200 bg-white text-slate-500 hover:border-[#078a2f]"
      }`}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

function BookingField({
  icon: Icon,
  label,
  value,
  onChange,
  type = "text",
  ...inputProps
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <Icon
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        {...inputProps}
        type={type}
        value={value}
        placeholder={label}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-[#078a2f] focus:ring-2 focus:ring-green-100"
      />
    </label>
  );
}
