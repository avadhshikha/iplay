"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Check,
  Clock3,
  IndianRupee,
  LoaderCircle,
  Smartphone,
} from "lucide-react";

import { calculateBookingPrice } from "@/lib/pricing";
import {
  formatDuration,
  formatSlotLabel,
  generateDurations,
  getEndTime,
  getIndiaNowParts,
} from "@/lib/slots";
import type { PaymentMode, SlotAvailability } from "@/lib/types";

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

export function BookingWizard() {
  const today = useMemo(() => getIndiaNowParts().date, []);
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    fetch(`/api/slots?date=${date}`)
      .then((response) => response.json())
      .then((payload) => {
        if (active) setSlots(payload.slots ?? []);
      })
      .catch(() => {
        if (active) setMessage("Could not load slots. Please try again.");
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });

    return () => {
      active = false;
    };
  }, [date]);

  function selectStartTime(time: string) {
    const index = slots.findIndex((slot) => slot.time === time);
    const nextSlot = slots[index + 1];
    setSelected(
      nextSlot?.available ? [time, nextSlot.time] : [time],
    );
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
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
  }

  const durationHours = selected.length / 2;
  const total = selected.length
    ? calculateBookingPrice(date, durationHours)
    : 0;

  if (success) {
    return (
      <section className="rounded-[2rem] border border-green-200 bg-white p-8 shadow-2xl shadow-green-950/10 sm:p-12">
        <span className="grid size-14 place-items-center rounded-full bg-green-100 text-green-700">
          <Check size={28} />
        </span>
        <h2 className="mt-6 text-3xl font-black tracking-tight text-green-950">
          Booking confirmed
        </h2>
        <p className="mt-3 leading-7 text-slate-600">
          Your turf is reserved for {date}, {formatSlotLabel(selected[0])} to{" "}
          {formatSlotLabel(getEndTime(selected[0], durationHours))}. Payment mode:{" "}
          {form.paymentMode.toUpperCase()}.
        </p>
        <button
          onClick={() => {
            setSuccess(false);
            setSelected([]);
            setForm(initialForm);
          }}
          className="mt-8 rounded-xl bg-green-700 px-5 py-3 text-sm font-bold text-white"
        >
          Make another booking
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-green-950/10 bg-white p-5 shadow-2xl shadow-green-950/10 sm:p-8">
      <div className="flex items-end justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">
            Book your turf
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-green-950">
            Choose a date and time
          </h2>
        </div>
        <div className="rounded-xl bg-green-50 px-3 py-2 text-right">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-green-700">
            Total
          </span>
          <span className="flex items-center text-lg font-black text-green-950">
            <IndianRupee size={16} />
            {total}
          </span>
        </div>
      </div>

      <label className="mt-6 block text-sm font-bold text-slate-700">
        Date
        <input
          type="date"
          min={today}
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            setLoadingSlots(true);
            setSelected([]);
            setMessage(null);
          }}
          className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
        />
      </label>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-700">Available slots</p>
          <p className="text-xs text-slate-500">30-minute start-time choices</p>
        </div>
        {loadingSlots ? (
          <div className="grid min-h-40 place-items-center text-green-700">
            <LoaderCircle className="animate-spin" />
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map((slot) => {
              const active = selected.includes(slot.time);
              const isStart = selected[0] === slot.time;
              return (
                <button
                  type="button"
                  key={slot.time}
                  disabled={!slot.available}
                  onClick={() => selectStartTime(slot.time)}
                  className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                    active
                      ? isStart
                        ? "border-green-800 bg-green-700 text-white shadow-md ring-2 ring-green-200"
                        : "border-green-600 bg-green-100 text-green-950"
                      : slot.available
                        ? "border-green-100 bg-green-50 text-green-900 hover:border-green-400"
                        : "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400"
                  }`}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50/70 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
            How long would you like to play?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {generateDurations().map((duration) => {
              const available = durationAvailable(duration);
              const active = durationHours === duration;
              return (
                <button
                  type="button"
                  key={duration}
                  disabled={!available}
                  onClick={() => chooseDuration(duration)}
                  className={`rounded-full border px-3 py-2 text-xs font-black transition ${
                    active
                      ? "border-green-700 bg-green-700 text-white"
                      : available
                        ? "border-green-200 bg-white text-green-900 hover:border-green-500"
                        : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  }`}
                >
                  {formatDuration(duration)}
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid gap-3 rounded-xl bg-white p-4 text-sm shadow-sm sm:grid-cols-3">
            <SummaryItem
              label="Start"
              value={formatSlotLabel(selected[0])}
              icon={Clock3}
            />
            <SummaryItem
              label="Ends"
              value={formatSlotLabel(getEndTime(selected[0], durationHours))}
              icon={Clock3}
            />
            <SummaryItem
              label="Duration"
              value={formatDuration(durationHours)}
              icon={Clock3}
            />
          </div>
        </div>
      )}

      <form onSubmit={submitBooking} className="mt-7 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Name"
            value={form.name}
            onChange={(name) => setForm({ ...form, name })}
            minLength={2}
            required
          />
          <Field
            label="Phone"
            value={form.phone}
            onChange={(phone) => setForm({ ...form, phone })}
            pattern="[6-9][0-9]{9}"
            inputMode="numeric"
            required
          />
        </div>
        <Field
          label="Email (optional)"
          type="email"
          value={form.email}
          onChange={(email) => setForm({ ...form, email })}
        />
        <div>
          <p className="text-sm font-bold text-slate-700">Payment mode</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
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
        </div>
        <label className="text-sm font-bold text-slate-700">
          Notes (optional)
          <textarea
            maxLength={200}
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            className="mt-2 min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
          />
        </label>
        {message && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            {message}
          </p>
        )}
        <button
          disabled={!selected.length || submitting}
          className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-4 text-sm font-black text-white shadow-lg shadow-green-800/20 transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {submitting && <LoaderCircle size={17} className="animate-spin" />}
          Confirm booking
        </button>
      </form>
    </section>
  );
}

function SummaryItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Clock3;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-lg bg-green-100 text-green-700">
        <Icon size={16} />
      </span>
      <span>
        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <strong className="block text-green-950">{value}</strong>
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
      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
        active
          ? "border-green-700 bg-green-50 text-green-950 ring-2 ring-green-100"
          : "border-slate-200 bg-white text-slate-600 hover:border-green-300"
      }`}
    >
      <Icon size={18} className={active ? "text-green-700" : "text-slate-400"} />
      <strong className="text-sm">{label}</strong>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  ...inputProps
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <input
        {...inputProps}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
      />
    </label>
  );
}
