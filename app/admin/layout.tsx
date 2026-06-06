import {
  BarChart3,
  CalendarDays,
  ContactRound,
  FileText,
  LayoutDashboard,
  ReceiptIndianRupee,
} from "lucide-react";
import Link from "next/link";

import { AdminDataProvider } from "@/components/admin/admin-data-provider";

const items = [
  ["/admin", "Dashboard", LayoutDashboard],
  ["/admin/bookings", "Bookings", CalendarDays],
  ["/admin/invoices", "Invoices", FileText],
  ["/admin/contacts", "Contacts", ContactRound],
  ["/admin/transactions", "Transactions", ReceiptIndianRupee],
  ["/admin/analytics", "Analytics", BarChart3],
] as const;

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/90 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/admin" className="font-black tracking-tight">
            I-Play Admin
          </Link>
          <Link href="/" className="text-sm font-semibold text-green-400">
            Public booking
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col">
          {items.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>
        <AdminDataProvider>{children}</AdminDataProvider>
      </div>
    </div>
  );
}
