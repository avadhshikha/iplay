import { notFound } from "next/navigation";

const sections = {
  bookings: {
    title: "Bookings",
    description:
      "Search, filter, add manual bookings, and cancel existing reservations.",
  },
  invoices: {
    title: "Invoices",
    description:
      "Create academy invoices and manage payment status without deleting records.",
  },
  contacts: {
    title: "Contacts",
    description:
      "View auto-created customer profiles, activity history, and contact notes.",
  },
  transactions: {
    title: "Transactions",
    description:
      "Review the unified booking and invoice payment ledger and export filtered data.",
  },
  analytics: {
    title: "Analytics",
    description:
      "Track revenue, booking volume, peak hours, and academy performance.",
  },
} as const;

export function generateStaticParams() {
  return Object.keys(sections).map((section) => ({ section }));
}

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!(section in sections)) notFound();

  const details = sections[section as keyof typeof sections];

  return (
    <main>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-400">
        Admin module
      </p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">{details.title}</h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-400">
        {details.description}
      </p>
      <section className="mt-8 rounded-2xl border border-dashed border-white/15 bg-white/5 p-8">
        <h2 className="font-bold">Ready for Supabase connection</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
          This module will be implemented after Supabase Auth and the initial
          database migration are connected, so operational data never ships
          through an unauthenticated admin route.
        </p>
      </section>
    </main>
  );
}
