import {
  BadgeIndianRupee,
  CircleGauge,
  MapPin,
  MessageCircle,
  PersonStanding,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { BookingWizard } from "@/components/booking/booking-wizard";

const whatsappHref =
  "https://wa.me/?text=Hello%20I-Play%20Sports%20Arena%2C%20I%20want%20to%20book%20a%20turf%20slot.";

function VenueDetails({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "px-1" : ""}>
      <h1
        className={
          compact
            ? "text-[1.75rem] font-black leading-none tracking-[-0.055em] text-slate-950"
            : "text-6xl font-black leading-[1.02] tracking-[-0.065em] text-slate-950"
        }
      >
        Book Your <span className="text-[#078a2f]">Turf Slot</span>
      </h1>
      <div className={compact ? "mt-3 space-y-1.5" : "mt-8 space-y-3"}>
        <p className="flex items-center gap-2 font-black text-slate-950">
          <PersonStanding className="text-[#078a2f]" size={compact ? 18 : 28} />
          <span className={compact ? "text-sm" : "text-2xl"}>
            i-Play Sports Arena
          </span>
        </p>
        <p className="flex items-start gap-2 text-slate-600">
          <MapPin className="mt-0.5 shrink-0 text-[#078a2f]" size={compact ? 15 : 22} />
          <span className={compact ? "text-xs" : "text-base"}>
            Balaji Nagar Near Avanigram, Khargone
          </span>
        </p>
      </div>
      <div
        className={`flex items-center gap-2.5 rounded-xl bg-[#f0f8f1] font-bold text-[#08772d] ${
          compact ? "mt-3 px-3 py-2 text-[11px]" : "mt-7 px-4 py-4 text-base"
        }`}
      >
        <BadgeIndianRupee size={compact ? 15 : 22} />
        Reserve online and pay at the venue
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f3f5f3] p-0 lg:p-6">
      <div className="mx-auto min-h-screen max-w-[1500px] overflow-hidden bg-white lg:min-h-[calc(100vh-3rem)] lg:rounded-[26px] lg:border lg:border-slate-200 lg:shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
        <div className="lg:grid lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[440px_minmax(0,1fr)]">
          <aside className="hidden border-r border-slate-200 bg-white p-7 lg:flex lg:flex-col xl:p-9">
            <div className="relative aspect-[1.48/1] overflow-hidden rounded-[22px]">
              <Image
                src="/turf-hero.webp"
                alt="Indoor football turf at I-Play Sports Arena"
                fill
                preload
                sizes="440px"
                className="object-cover"
              />
            </div>
            <div className="mt-7">
              <VenueDetails />
            </div>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="mt-6 flex items-center justify-center gap-3 rounded-xl bg-[#078d32] px-5 py-4 text-lg font-black text-white shadow-sm transition hover:bg-[#057629]"
            >
              <MessageCircle size={25} />
              Chat on WhatsApp
            </a>
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700">
              <CircleGauge className="text-slate-900" size={22} />
              <span>Weekdays ₹800/hr</span>
              <span className="text-slate-300">•</span>
              <span>Weekend ₹1000/hr</span>
            </div>
            <Link
              href="/admin"
              className="mt-auto pt-8 text-center text-xs font-semibold text-slate-400 transition hover:text-[#078a2f]"
            >
              Admin workspace
            </Link>
          </aside>

          <section className="min-w-0 bg-white">
            <div className="p-3 pb-0 lg:hidden">
              <div className="relative aspect-[2.75/1] overflow-hidden rounded-2xl">
                <Image
                  src="/turf-hero.webp"
                  alt="Indoor football turf at I-Play Sports Arena"
                  fill
                  preload
                  sizes="(max-width: 1023px) calc(100vw - 24px), 440px"
                  className="object-cover"
                />
              </div>
              <div className="mt-3">
                <VenueDetails compact />
              </div>
            </div>
            <div className="lg:m-5 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-slate-200 xl:m-7">
              <BookingWizard />
            </div>
          </section>
        </div>
      </div>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with I-Play on WhatsApp"
        className="fixed bottom-4 right-4 z-30 grid size-12 place-items-center rounded-full border-2 border-white bg-[#079332] text-white shadow-lg transition hover:scale-105 lg:bottom-8 lg:right-8"
      >
        <MessageCircle size={25} />
      </a>
    </main>
  );
}
