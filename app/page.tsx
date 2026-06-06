import { CalendarDays, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

import { BookingWizard } from "@/components/booking/booking-wizard";

const highlights = [
  {
    icon: CalendarDays,
    title: "Pick your time",
    text: "Choose your start time and play for 30 minutes up to 5 hours.",
  },
  {
    icon: Sparkles,
    title: "Clear pricing",
    text: "Weekday and weekend rates are calculated automatically.",
  },
  {
    icon: ShieldCheck,
    title: "Instant conflict check",
    text: "Availability is verified again before your booking is saved.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dcfce7,_transparent_42%),linear-gradient(#f8faf7,#eef4ee)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="I-Play home">
          <span className="grid size-11 place-items-center rounded-2xl bg-green-700 text-lg font-black text-white shadow-lg shadow-green-900/15">
            IP
          </span>
          <span>
            <strong className="block text-lg tracking-tight">I-Play</strong>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-green-800/70">
              Turf booking
            </span>
          </span>
        </Link>
        <Link
          href="/admin"
          className="rounded-full border border-green-900/10 bg-white/80 px-4 py-2 text-sm font-semibold text-green-950 shadow-sm transition hover:bg-white"
        >
          Admin
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:pt-16">
        <div className="lg:sticky lg:top-10">
          <p className="mb-4 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-green-800">
            Play more. Plan less.
          </p>
          <h1 className="max-w-xl text-5xl font-black leading-[0.98] tracking-[-0.06em] text-green-950 sm:text-6xl">
            Your next game starts here.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">
            Reserve your turf in a few taps. Pick a date, select consecutive
            slots, and confirm your details.
          </p>

          <div className="mt-9 grid gap-3">
            {highlights.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="flex gap-4 rounded-2xl border border-white/80 bg-white/60 p-4 shadow-sm backdrop-blur"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-green-100 text-green-700">
                  <Icon size={19} />
                </span>
                <span>
                  <strong className="block text-sm text-green-950">
                    {title}
                  </strong>
                  <span className="mt-1 block text-sm leading-5 text-slate-600">
                    {text}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <BookingWizard />
      </section>
    </main>
  );
}
