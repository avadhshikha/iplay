"use client";

import { FormEvent, useState } from "react";
import {
  Activity,
  CalendarCheck,
  Download,
  Eye,
  FileDown,
  IndianRupee,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";

import {
  bookingTimeRange,
  type AdminBooking,
  type AdminContact,
  type AdminData,
  type AdminInvoice,
  type AdminTransaction,
} from "@/lib/admin-data";
import { formatSlotLabel, generateSlotTimes, getIndiaNowParts } from "@/lib/slots";
import { useAdminData } from "@/components/admin/admin-data-provider";

export type AdminSection =
  | "dashboard"
  | "bookings"
  | "invoices"
  | "contacts"
  | "transactions"
  | "analytics";

const titles: Record<AdminSection, [string, string]> = {
  dashboard: ["Dashboard", "Today’s operations at a glance."],
  bookings: ["Bookings", "Search, add, and manage turf reservations."],
  invoices: ["Invoices", "Create and track academy invoices."],
  contacts: ["Contacts", "Automatically derived customer profiles."],
  transactions: ["Transactions", "Unified booking and invoice payment ledger."],
  analytics: ["Analytics", "Revenue and booking trends from current records."],
};

const control =
  "rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-green-400";

export function AdminConsole({ section }: { section: AdminSection }) {
  const {
    data,
    loading,
    error,
    refresh,
    createBooking,
    cancelBooking,
    createInvoice,
    updateInvoiceStatus,
  } = useAdminData();
  const [search, setSearch] = useState("");
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [title, subtitle] = titles[section];

  return (
    <main className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-400">
            Live Supabase workspace
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
        </div>
        {section === "bookings" && (
          <ActionButton onClick={() => setShowBookingForm(true)}>
            <Plus size={16} /> Add manual booking
          </ActionButton>
        )}
        {section === "invoices" && (
          <ActionButton onClick={() => setShowInvoiceForm(true)}>
            <Plus size={16} /> Create invoice
          </ActionButton>
        )}
        {section === "transactions" && (
          <ActionButton onClick={() => exportTransactions(data.transactions)}>
            <Download size={16} /> Export CSV
          </ActionButton>
        )}
        <button
          onClick={() => void refresh()}
          aria-label="Refresh Supabase data"
          className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/5"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {error && (
        <p className="mt-6 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      )}
      {!error && (
        <p className="mt-6 rounded-xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm text-green-100">
          Connected to Supabase. Changes made here are saved to the live database.
        </p>
      )}

      {loading && (
        <div className="mt-10 flex items-center gap-3 text-slate-400">
          <LoaderCircle className="animate-spin" size={18} /> Loading Supabase data…
        </div>
      )}

      {!loading && section === "dashboard" && (
        <Dashboard data={data} contactsCount={data.contacts.length} />
      )}
      {!loading && section === "bookings" && (
        <Bookings
          bookings={data.bookings}
          search={search}
          setSearch={setSearch}
          cancelBooking={cancelBooking}
        />
      )}
      {!loading && section === "invoices" && (
        <Invoices
          invoices={data.invoices}
          setStatus={updateInvoiceStatus}
        />
      )}
      {!loading && section === "contacts" && <Contacts contacts={data.contacts} />}
      {!loading && section === "transactions" && (
        <Transactions transactions={data.transactions} />
      )}
      {!loading && section === "analytics" && <Analytics data={data} />}

      {showBookingForm && (
        <BookingModal
          onClose={() => setShowBookingForm(false)}
          onSave={async (booking) => {
            await createBooking(booking);
            setShowBookingForm(false);
          }}
        />
      )}
      {showInvoiceForm && (
        <InvoiceModal
          onClose={() => setShowInvoiceForm(false)}
          onSave={async (invoice) => {
            await createInvoice(invoice);
            setShowInvoiceForm(false);
          }}
        />
      )}
    </main>
  );
}

function Dashboard({
  data,
  contactsCount,
}: {
  data: AdminData;
  contactsCount: number;
}) {
  const today = getIndiaNowParts().date;
  const todayBookings = data.bookings.filter(
    (booking) => booking.date === today && booking.status !== "cancelled",
  );
  const completedRevenue = data.transactions
    .filter((transaction) => transaction.status === "completed")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const todayRevenue = todayBookings
    .filter((booking) => booking.status === "confirmed")
    .reduce((total, booking) => total + booking.totalPrice, 0);

  const stats = [
    ["Today’s bookings", todayBookings.length, CalendarCheck],
    ["Today’s revenue", `₹${todayRevenue.toLocaleString("en-IN")}`, IndianRupee],
    ["Total revenue", `₹${completedRevenue.toLocaleString("en-IN")}`, Activity],
    ["Contacts", contactsCount, Users],
  ] as const;

  const upcoming = data.bookings
    .filter((booking) => booking.date >= today && booking.status !== "cancelled")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  return (
    <>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, Icon]) => (
          <section key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <Icon size={19} className="text-green-400" />
            <p className="mt-5 text-sm text-slate-400">{label}</p>
            <strong className="mt-1 block text-2xl">{value}</strong>
          </section>
        ))}
      </div>
      <Panel title="Upcoming bookings">
        <BookingTable bookings={upcoming} />
      </Panel>
    </>
  );
}

function Bookings({
  bookings,
  search,
  setSearch,
  cancelBooking,
}: {
  bookings: AdminBooking[];
  search: string;
  setSearch: (value: string) => void;
  cancelBooking: (id: string) => Promise<void>;
}) {
  const query = search.toLowerCase();
  const filtered = bookings.filter(
    (booking) =>
      booking.customerName.toLowerCase().includes(query) || booking.phone.includes(query),
  );

  return (
    <Panel
      title="All bookings"
      action={
        <label className="relative">
          <Search size={15} className="absolute left-3 top-3 text-slate-500" />
          <input
            aria-label="Search bookings"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or phone"
            className={`${control} pl-9`}
          />
        </label>
      }
    >
      <BookingTable bookings={filtered} onCancel={cancelBooking} />
    </Panel>
  );
}

function BookingTable({
  bookings,
  onCancel,
}: {
  bookings: AdminBooking[];
  onCancel?: (id: string) => void;
}) {
  if (bookings.length === 0) {
    return <EmptyState text="No bookings found in Supabase." />;
  }

  return (
    <DataTable
      headers={["Date", "Time", "Customer", "Phone", "Price", "Source", "Status", ""]}
    >
      {bookings.map((booking) => (
        <tr key={booking.id} className="border-t border-white/5">
          <Cell>{booking.date}</Cell>
          <Cell>{bookingTimeRange(booking)}</Cell>
          <Cell strong>{booking.customerName}</Cell>
          <Cell>{booking.phone}</Cell>
          <Cell>₹{booking.totalPrice.toLocaleString("en-IN")}</Cell>
          <Cell>{booking.source}</Cell>
          <Cell>
            <Status value={booking.status} />
          </Cell>
          <Cell>
            {onCancel && booking.status !== "cancelled" && (
              <button
                onClick={() => onCancel(booking.id)}
                className="text-xs font-bold text-rose-400 hover:text-rose-300"
              >
                Cancel
              </button>
            )}
          </Cell>
        </tr>
      ))}
    </DataTable>
  );
}

function Invoices({
  invoices,
  setStatus,
}: {
  invoices: AdminInvoice[];
  setStatus: (id: string, status: AdminInvoice["status"]) => Promise<void>;
}) {
  if (invoices.length === 0) {
    return <Panel title="All invoices"><EmptyState text="No invoices found in Supabase." /></Panel>;
  }

  return (
    <Panel title="All invoices">
      <DataTable
        headers={["Invoice", "Date", "Customer", "Academy", "Amount", "Status", "Actions"]}
      >
        {invoices.map((invoice) => (
          <tr key={invoice.id} className="border-t border-white/5">
            <Cell strong>{invoice.invoiceNumber}</Cell>
            <Cell>{invoice.invoiceDate}</Cell>
            <Cell>{invoice.customerName}</Cell>
            <Cell>{invoice.academyType}</Cell>
            <Cell>₹{invoice.amount.toLocaleString("en-IN")}</Cell>
            <Cell>
              <Status value={invoice.status} />
            </Cell>
            <Cell>
              <div className="flex items-center gap-3">
                <a
                  href={`/api/admin/invoices/${invoice.id}/pdf?preview=1`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs font-bold text-sky-300 hover:text-sky-200"
                >
                  <Eye size={14} /> Preview
                </a>
                <a
                  href={`/api/admin/invoices/${invoice.id}/pdf`}
                  className="flex items-center gap-1 text-xs font-bold text-green-400 hover:text-green-300"
                >
                  <FileDown size={14} /> PDF
                </a>
              </div>
              {invoice.status === "pending" && (
                <button
                  onClick={() => setStatus(invoice.id, "paid")}
                  className="mt-2 text-xs font-bold text-amber-300"
                >
                  Mark paid
                </button>
              )}
            </Cell>
          </tr>
        ))}
      </DataTable>
    </Panel>
  );
}

function Contacts({ contacts }: { contacts: AdminContact[] }) {
  if (contacts.length === 0) {
    return <Panel title="Auto-created contacts"><EmptyState text="No contacts found in Supabase yet." /></Panel>;
  }

  return (
    <Panel title="Auto-created contacts">
      <DataTable
        headers={["Name", "Phone", "Type", "Total spent", "Bookings", "Invoices", "Last seen"]}
      >
        {contacts.map((contact) => (
          <tr key={contact.phone} className="border-t border-white/5">
            <Cell strong>{contact.name}</Cell>
            <Cell>{contact.phone}</Cell>
            <Cell>{contact.type}</Cell>
            <Cell>₹{contact.totalSpent.toLocaleString("en-IN")}</Cell>
            <Cell>{contact.bookingCount}</Cell>
            <Cell>{contact.invoiceCount}</Cell>
            <Cell>{contact.lastSeen}</Cell>
          </tr>
        ))}
      </DataTable>
    </Panel>
  );
}

function Transactions({
  transactions,
}: {
  transactions: AdminTransaction[];
}) {
  const total = transactions
    .filter((item) => item.status === "completed")
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <Panel
      title="Payment ledger"
      action={<strong className="text-sm text-green-400">Completed: ₹{total.toLocaleString("en-IN")}</strong>}
    >
      {transactions.length === 0 ? <EmptyState text="No transactions found in Supabase." /> : <DataTable headers={["Date", "Type", "Customer", "Phone", "Amount", "Source", "Status"]}>
        {transactions.map((transaction) => (
          <tr key={transaction.id} className="border-t border-white/5">
            <Cell>{transaction.date}</Cell>
            <Cell>{transaction.type}</Cell>
            <Cell strong>{transaction.customerName}</Cell>
            <Cell>{transaction.phone}</Cell>
            <Cell>₹{transaction.amount.toLocaleString("en-IN")}</Cell>
            <Cell>{transaction.source}</Cell>
            <Cell>
              <Status value={transaction.status} />
            </Cell>
          </tr>
        ))}
      </DataTable>}
    </Panel>
  );
}

function Analytics({ data }: { data: AdminData }) {
  const transactions = data.transactions.filter((item) => item.status === "completed");
  const categoryTotals = ["turf", "yoga", "chess", "cricket"].map((type) => ({
    type,
    total: transactions
      .filter((item) => item.type === type)
      .reduce((sum, item) => sum + item.amount, 0),
  }));
  const maxCategory = Math.max(...categoryTotals.map((item) => item.total), 1);
  const hourTotals = generateSlotTimes().map((time) => ({
    label: formatSlotLabel(time),
    total: data.bookings.filter(
      (booking) => booking.startTime === time && booking.status !== "cancelled",
    ).length,
  }));
  const maxHour = Math.max(...hourTotals.map((item) => item.total), 1);

  return (
    <div className="mt-7 grid gap-5 xl:grid-cols-2">
      <ChartPanel title="Revenue by category">
        {categoryTotals.map((item) => (
          <Bar
            key={item.type}
            label={item.type}
            value={`₹${item.total.toLocaleString("en-IN")}`}
            width={(item.total / maxCategory) * 100}
          />
        ))}
      </ChartPanel>
      <ChartPanel title="Peak booking hours">
        {hourTotals
          .filter((item) => item.total > 0)
          .map((item) => (
            <Bar
              key={item.label}
              label={item.label}
              value={`${item.total} bookings`}
              width={(item.total / maxHour) * 100}
            />
          ))}
      </ChartPanel>
    </div>
  );
}

function BookingModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (booking: Omit<AdminBooking, "id" | "totalPrice" | "source">) => Promise<void>;
}) {
  const today = getIndiaNowParts().date;
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    date: today,
    startTime: "09:30",
    durationHours: 1,
    status: "confirmed" as AdminBooking["status"],
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave(form);
  }

  return (
    <Modal title="Add manual booking" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Customer name" required value={form.customerName} onChange={(customerName) => setForm({ ...form, customerName })} />
        <Field label="Phone" required pattern="[6-9][0-9]{9}" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
        <Field label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" type="date" min={today} required value={form.date} onChange={(date) => setForm({ ...form, date })} />
          <Select label="Start time" value={form.startTime} onChange={(startTime) => setForm({ ...form, startTime })}>
            {generateSlotTimes().map((time) => <option key={time} value={time}>{formatSlotLabel(time)}</option>)}
          </Select>
        </div>
        <Select label="Duration" value={String(form.durationHours)} onChange={(durationHours) => setForm({ ...form, durationHours: Number(durationHours) })}>
          {[1, 2, 3, 4, 5].map((hours) => <option key={hours} value={hours}>{hours} hour{hours > 1 ? "s" : ""}</option>)}
        </Select>
        <ActionButton type="submit">Save booking</ActionButton>
      </form>
    </Modal>
  );
}

function InvoiceModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (invoice: Omit<AdminInvoice, "id" | "invoiceNumber">) => Promise<void>;
}) {
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    academyType: "yoga" as AdminInvoice["academyType"],
    description: "",
    amount: 2500,
    invoiceDate: getIndiaNowParts().date,
    status: "paid" as AdminInvoice["status"],
  });

  return (
    <Modal title="Create invoice" onClose={onClose}>
      <form onSubmit={async (event) => { event.preventDefault(); await onSave(form); }} className="grid gap-4">
        <Field label="Customer name" required value={form.customerName} onChange={(customerName) => setForm({ ...form, customerName })} />
        <Field label="Phone" required pattern="[6-9][0-9]{9}" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
        <Field label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        <Select label="Academy" value={form.academyType} onChange={(academyType) => setForm({ ...form, academyType: academyType as AdminInvoice["academyType"] })}>
          <option value="yoga">Yoga by Shikha</option>
          <option value="chess">Chess Academy</option>
          <option value="cricket">Cricket Academy</option>
        </Select>
        <Field label="Description" value={form.description} onChange={(description) => setForm({ ...form, description })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount" type="number" min="1" required value={String(form.amount)} onChange={(amount) => setForm({ ...form, amount: Number(amount) })} />
          <Field label="Invoice date" type="date" required value={form.invoiceDate} onChange={(invoiceDate) => setForm({ ...form, invoiceDate })} />
        </div>
        <ActionButton type="submit">Save invoice</ActionButton>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-black">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="rounded-lg p-2 hover:bg-white/10"><X size={18} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
        <h2 className="font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-white/10 bg-white/5 p-5"><h2 className="font-bold">{title}</h2><div className="mt-5 grid gap-4">{children}</div></section>;
}

function Bar({ label, value, width }: { label: string; value: string; width: number }) {
  return <div><div className="mb-1 flex justify-between text-xs"><span className="capitalize text-slate-300">{label}</span><span className="text-slate-400">{value}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-green-400" style={{ width: `${Math.max(width, 3)}%` }} /></div></div>;
}

function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-400"><tr>{headers.map((header) => <th key={header} className="px-5 py-3 font-semibold">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function Cell({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return <td className={`whitespace-nowrap px-5 py-4 ${strong ? "font-bold text-white" : "text-slate-300"}`}>{children}</td>;
}

function Status({ value }: { value: string }) {
  const tone = value === "confirmed" || value === "paid" || value === "completed" ? "bg-green-400/10 text-green-300" : value === "cancelled" || value === "refunded" ? "bg-rose-400/10 text-rose-300" : "bg-amber-400/10 text-amber-200";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${tone}`}>{value}</span>;
}

function ActionButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className="flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-green-400">{children}</button>;
}

function Field({ label, value, onChange, ...props }: { label: string; value: string; onChange: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return <label className="grid gap-2 text-sm font-bold text-slate-300">{label}<input {...props} value={value} onChange={(event) => onChange(event.target.value)} className={control} /></label>;
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold text-slate-300">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className={control}>{children}</select></label>;
}

function EmptyState({ text }: { text: string }) {
  return <p className="px-5 py-10 text-center text-sm text-slate-400">{text}</p>;
}

function exportTransactions(transactions: AdminTransaction[]) {
  const rows = [["Date", "Type", "Customer", "Phone", "Amount", "Source", "Status"], ...transactions.map((item) => [item.date, item.type, item.customerName, item.phone, String(item.amount), item.source, item.status])];
  const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "iplay-transactions.csv";
  link.click();
  URL.revokeObjectURL(url);
}
