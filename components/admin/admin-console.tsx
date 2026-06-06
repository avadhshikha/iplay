"use client";

import { FormEvent, useState } from "react";
import {
  BadgeIndianRupee,
  CalendarCheck,
  Clock3,
  Download,
  Edit3,
  Eye,
  FileDown,
  IndianRupee,
  LoaderCircle,
  Mail,
  NotebookTabs,
  Phone,
  Plus,
  RefreshCw,
  Search,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";

import {
  academyPrograms,
  getAcademyProgram,
  invoiceAmountForPlan,
  invoiceDescriptionForPlan,
  programOptionsForClientType,
  type AcademyProgramSlug,
  type ClientType,
  type InvoiceFeeKind,
  type MemberStatus,
} from "@/lib/academy-programs";
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
  dashboard: ["Dashboard", "Monthly cashflow, members, fees, and daily operations."],
  bookings: ["Bookings", "Search, add, and manage turf reservations."],
  invoices: ["Invoices", "Create and track academy invoices."],
  contacts: ["Contacts", "Searchable CRM for leads, members, and turf clients."],
  transactions: ["Transactions", "Unified booking and invoice payment ledger."],
  analytics: ["Analytics", "Revenue and booking trends from current records."],
};

const control =
  "rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-green-400";

type ContactInput = Omit<
  AdminContact,
  "id" | "totalSpent" | "invoiceCount" | "bookingCount" | "firstSeen" | "lastSeen"
>;

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
    createContact,
    updateContact,
  } = useAdminData();
  const [search, setSearch] = useState("");
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
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
        {section === "contacts" && (
          <ActionButton onClick={() => setShowContactForm(true)}>
            <UserRoundPlus size={16} /> Add contact
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
      {!loading && section === "contacts" && (
        <Contacts data={data} updateContact={updateContact} />
      )}
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
      {showContactForm && (
        <ContactModal
          onClose={() => setShowContactForm(false)}
          onSave={async (contact) => {
            await createContact(contact);
            setShowContactForm(false);
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
  const month = today.slice(0, 7);
  const todayBookings = data.bookings.filter(
    (booking) => booking.date === today && booking.status !== "cancelled",
  );
  const monthTransactions = data.transactions.filter((transaction) =>
    transaction.date.startsWith(month),
  );
  const collected = monthTransactions
    .filter((transaction) => transaction.status === "completed")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const outstanding = monthTransactions
    .filter((transaction) => transaction.status === "pending")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const activeMembers = data.contacts.filter(
    (contact) => contact.memberStatus === "active" && contact.clientType !== "turf",
  ).length;
  const demos = data.contacts.filter((contact) => contact.memberStatus === "demo").length;

  const stats = [
    ["Today’s bookings", todayBookings.length, CalendarCheck],
    ["Collected this month", `₹${collected.toLocaleString("en-IN")}`, IndianRupee],
    ["Outstanding this month", `₹${outstanding.toLocaleString("en-IN")}`, BadgeIndianRupee],
    ["Active academy members", activeMembers, Users],
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
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Upcoming turf bookings" flushTop>
          <BookingTable bookings={upcoming} />
        </Panel>
        <Panel
          title="Contact book pulse"
          action={<strong className="text-xs text-green-300">{contactsCount} total contacts</strong>}
          flushTop
        >
          <div className="grid grid-cols-2 gap-3 p-5">
            <MetricMini label="Active members" value={activeMembers} />
            <MetricMini label="Demo leads" value={demos} />
            <MetricMini
              label="Paid invoices"
              value={data.invoices.filter((invoice) => invoice.status === "paid").length}
            />
            <MetricMini
              label="Pending invoices"
              value={data.invoices.filter((invoice) => invoice.status === "pending").length}
            />
          </div>
        </Panel>
      </div>
      <Panel title="Academy fee plans">
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          {academyPrograms.map((program) => (
            <article
              key={program.slug}
              className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-green-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-green-300">
                  {program.category}
                </span>
                <strong className="text-lg text-green-300">
                  ₹{program.monthlyFee.toLocaleString("en-IN")}
                  <span className="text-[10px] font-semibold text-slate-500">/mo</span>
                </strong>
              </div>
              <h3 className="mt-4 font-black">{program.name}</h3>
              <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <Clock3 size={13} /> {program.schedule}
              </p>
              <p className="mt-2 text-xs text-slate-500">{program.audience}</p>
              {program.registrationFee > 0 && (
                <p className="mt-3 rounded-lg bg-amber-400/10 px-2.5 py-2 text-xs font-bold text-amber-200">
                  New registration: ₹{program.registrationFee.toLocaleString("en-IN")} extra
                </p>
              )}
            </article>
          ))}
        </div>
      </Panel>
    </>
  );
}

function MetricMini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
      <strong className="block text-xl">{value}</strong>
      <span className="mt-1 block text-xs text-slate-500">{label}</span>
    </div>
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
        headers={["Invoice", "Date", "Customer", "Class / batch", "Amount", "Status", "Actions"]}
      >
        {invoices.map((invoice) => (
          <tr key={invoice.id} className="border-t border-white/5">
            <Cell strong>{invoice.invoiceNumber}</Cell>
            <Cell>{invoice.invoiceDate}</Cell>
            <Cell>{invoice.customerName}</Cell>
            <Cell>
              {getAcademyProgram(invoice.programSlug)?.shortName ?? invoice.academyType}
            </Cell>
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

function Contacts({
  data,
  updateContact,
}: {
  data: AdminData;
  updateContact: (contact: AdminContact) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | ClientType>("all");
  const [programFilter, setProgramFilter] = useState<"all" | "none" | AcademyProgramSlug>("all");
  const [status, setStatus] = useState<"all" | MemberStatus>("all");
  const [selected, setSelected] = useState<AdminContact | null>(null);
  const [editing, setEditing] = useState<AdminContact | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const contacts = data.contacts.filter((contact) => {
    const program = getAcademyProgram(contact.programSlug);
    const matchesQuery =
      !normalizedQuery ||
      contact.name.toLowerCase().includes(normalizedQuery) ||
      contact.phone.includes(normalizedQuery) ||
      contact.email.toLowerCase().includes(normalizedQuery) ||
      program?.name.toLowerCase().includes(normalizedQuery);
    return (
      matchesQuery &&
      (type === "all" || contact.clientType === type) &&
      (programFilter === "all" ||
        (programFilter === "none" ? !contact.programSlug : contact.programSlug === programFilter)) &&
      (status === "all" || contact.memberStatus === status)
    );
  });

  return (
    <>
      <Panel
        title="Contact book"
        action={
          <button
            onClick={() => exportContacts(contacts)}
            className="flex items-center gap-2 text-xs font-bold text-green-300 hover:text-green-200"
          >
            <Download size={14} /> Download filtered contacts
          </button>
        }
      >
        <div className="grid gap-3 border-b border-white/10 p-4 md:grid-cols-2 xl:grid-cols-[1fr_170px_220px_170px]">
          <label className="relative">
            <Search size={15} className="absolute left-3 top-3 text-slate-500" />
            <input
              aria-label="Search contacts"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, phone, email, or batch"
              className={`${control} w-full pl-9`}
            />
          </label>
          <select
            aria-label="Filter contacts by client type"
            value={type}
            onChange={(event) => setType(event.target.value as "all" | ClientType)}
            className={control}
          >
            <option value="all">All client types</option>
            <option value="turf">Turf booking</option>
            <option value="yoga">Yoga member</option>
            <option value="chess">Chess member</option>
            <option value="cricket">Cricket member</option>
          </select>
          <select
            aria-label="Filter contacts by class"
            value={programFilter}
            onChange={(event) =>
              setProgramFilter(event.target.value as "all" | "none" | AcademyProgramSlug)
            }
            className={control}
          >
            <option value="all">All classes / batches</option>
            <option value="none">No batch assigned</option>
            {academyPrograms.map((program) => (
              <option key={program.slug} value={program.slug}>
                {program.shortName}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter contacts by member status"
            value={status}
            onChange={(event) => setStatus(event.target.value as "all" | MemberStatus)}
            className={control}
          >
            <option value="all">All statuses</option>
            <option value="demo">Demo / lead</option>
            <option value="active">Active member</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {contacts.length === 0 ? (
          <EmptyState text="No contacts match these filters." />
        ) : (
          <DataTable
            headers={[
              "Contact",
              "Client type",
              "Batch",
              "Status",
              "Total spent",
              "Activity",
              "Actions",
            ]}
          >
            {contacts.map((contact) => {
              const program = getAcademyProgram(contact.programSlug);
              return (
                <tr key={contact.id} className="border-t border-white/5">
                  <Cell strong>
                    <span className="block">{contact.name}</span>
                    <span className="mt-1 block text-xs font-normal text-slate-500">
                      {contact.phone}
                    </span>
                  </Cell>
                  <Cell>
                    <span className="capitalize">{contact.clientType}</span>
                  </Cell>
                  <Cell>
                    <span className="block">
                      {program?.shortName ??
                        (contact.clientType === "turf" ? "Turf client" : "No batch assigned")}
                    </span>
                    {program && (
                      <span className="mt-1 block text-xs text-slate-500">
                        {program.schedule}
                      </span>
                    )}
                  </Cell>
                  <Cell><Status value={contact.memberStatus} /></Cell>
                  <Cell>₹{contact.totalSpent.toLocaleString("en-IN")}</Cell>
                  <Cell>
                    {contact.bookingCount} bookings · {contact.invoiceCount} invoices
                  </Cell>
                  <Cell>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelected(contact)}
                        className="text-xs font-bold text-sky-300 hover:text-sky-200"
                      >
                        View history
                      </button>
                      <button
                        onClick={() => setEditing(contact)}
                        className="text-xs font-bold text-green-300 hover:text-green-200"
                      >
                        Edit
                      </button>
                    </div>
                  </Cell>
                </tr>
              );
            })}
          </DataTable>
        )}
      </Panel>
      {selected && (
        <ContactHistoryModal
          contact={selected}
          data={data}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditing(selected);
            setSelected(null);
          }}
        />
      )}
      {editing && (
        <ContactModal
          contact={editing}
          onClose={() => setEditing(null)}
          onSave={async (contact) => {
            await updateContact({ ...editing, ...contact });
            setEditing(null);
          }}
        />
      )}
    </>
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
  const month = getIndiaNowParts().date.slice(0, 7);
  const transactions = data.transactions.filter(
    (item) => item.status === "completed" && item.date.startsWith(month),
  );
  const categoryTotals = ["turf", "yoga", "chess", "cricket"].map((type) => ({
    type,
    total: transactions
      .filter((item) => item.type === type)
      .reduce((sum, item) => sum + item.amount, 0),
  }));
  const maxCategory = Math.max(...categoryTotals.map((item) => item.total), 1);
  const dailyTotals = Array.from({ length: 31 }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, "0")}`;
    return {
      date,
      total: transactions
        .filter((item) => item.date === date)
        .reduce((sum, item) => sum + item.amount, 0),
    };
  }).filter((item) => item.total > 0);
  const maxDay = Math.max(...dailyTotals.map((item) => item.total), 1);
  const programMembers = academyPrograms.map((program) => ({
    name: program.shortName,
    total: data.contacts.filter(
      (contact) =>
        contact.programSlug === program.slug && contact.memberStatus === "active",
    ).length,
  }));
  const maxMembers = Math.max(...programMembers.map((item) => item.total), 1);

  return (
    <div className="mt-7 grid gap-5 xl:grid-cols-2">
      <ChartPanel title="This month’s collected revenue">
        {categoryTotals.map((item) => (
          <Bar
            key={item.type}
            label={item.type}
            value={`₹${item.total.toLocaleString("en-IN")}`}
            width={(item.total / maxCategory) * 100}
          />
        ))}
      </ChartPanel>
      <ChartPanel title="Daily cashflow this month">
        {dailyTotals.length ? dailyTotals.map((item) => (
            <Bar
              key={item.date}
              label={item.date}
              value={`₹${item.total.toLocaleString("en-IN")}`}
              width={(item.total / maxDay) * 100}
            />
          )) : <EmptyState text="No completed payments this month." />}
      </ChartPanel>
      <ChartPanel title="Active members by class">
        {programMembers.map((item) => (
          <Bar
            key={item.name}
            label={item.name}
            value={`${item.total} members`}
            width={(item.total / maxMembers) * 100}
          />
        ))}
      </ChartPanel>
      <ChartPanel title="Monthly operations">
        <MetricMini label="Completed payments" value={transactions.length} />
        <MetricMini
          label="Pending payments"
          value={data.transactions.filter(
            (item) => item.status === "pending" && item.date.startsWith(month),
          ).length}
        />
        <MetricMini
          label="New contacts this month"
          value={data.contacts.filter((item) => item.firstSeen.startsWith(month)).length}
        />
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
    programSlug: "yoga_morning" as AcademyProgramSlug,
    feeKind: "monthly" as InvoiceFeeKind,
    description: invoiceDescriptionForPlan("yoga_morning", "monthly"),
    amount: invoiceAmountForPlan("yoga_morning", "monthly"),
    invoiceDate: getIndiaNowParts().date,
    status: "paid" as AdminInvoice["status"],
  });

  function choosePlan(programSlug: AcademyProgramSlug, feeKind = form.feeKind) {
    const program = getAcademyProgram(programSlug)!;
    const nextFeeKind =
      feeKind === "new_registration" && !program.registrationFee ? "monthly" : feeKind;
    setForm({
      ...form,
      academyType: program.category,
      programSlug,
      feeKind: nextFeeKind,
      description: invoiceDescriptionForPlan(programSlug, nextFeeKind),
      amount: invoiceAmountForPlan(programSlug, nextFeeKind),
    });
  }

  return (
    <Modal title="Create invoice" onClose={onClose}>
      <form onSubmit={async (event) => { event.preventDefault(); await onSave(form); }} className="grid gap-4">
        <Field label="Customer name" required value={form.customerName} onChange={(customerName) => setForm({ ...form, customerName })} />
        <Field label="Phone" required pattern="[6-9][0-9]{9}" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
        <Field label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        <Select
          label="Class / batch"
          value={form.programSlug}
          onChange={(programSlug) => choosePlan(programSlug as AcademyProgramSlug)}
        >
          {academyPrograms.map((program) => (
            <option key={program.slug} value={program.slug}>
              {program.name} · {program.schedule}
            </option>
          ))}
        </Select>
        <Select
          label="Fee type"
          value={form.feeKind}
          onChange={(feeKind) => choosePlan(form.programSlug, feeKind as InvoiceFeeKind)}
        >
          <option value="monthly">Monthly fee</option>
          {getAcademyProgram(form.programSlug)?.registrationFee ? (
            <option value="new_registration">First month + registration fee</option>
          ) : null}
          <option value="other">Custom fee</option>
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

function ContactModal({
  contact,
  onClose,
  onSave,
}: {
  contact?: AdminContact;
  onClose: () => void;
  onSave: (contact: ContactInput) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ContactInput>({
    name: contact?.name ?? "",
    phone: contact?.phone ?? "",
    email: contact?.email ?? "",
    clientType: contact?.clientType ?? "turf",
    programSlug: contact?.programSlug ?? "",
    memberStatus: contact?.memberStatus ?? "demo",
    notes: contact?.notes ?? "",
  });
  const programs = programOptionsForClientType(form.clientType);

  function changeClientType(clientType: ClientType) {
    setForm({
      ...form,
      clientType,
      programSlug: clientType === "turf" ? "" : (programOptionsForClientType(clientType)[0]?.slug ?? ""),
    });
  }

  return (
    <Modal title={contact ? "Edit contact" : "Add contact without payment"} onClose={onClose}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          try {
            await onSave(form);
          } finally {
            setSaving(false);
          }
        }}
        className="grid gap-4"
      >
        {!contact && (
          <p className="rounded-xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
            Use this for demos, walk-ins, enquiries, and members who have not paid yet.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Name"
            required
            value={form.name}
            onChange={(name) => setForm({ ...form, name })}
          />
          <Field
            label="Phone"
            required
            pattern="[6-9][0-9]{9}"
            value={form.phone}
            onChange={(phone) => setForm({ ...form, phone })}
          />
        </div>
        <Field
          label="Email"
          type="email"
          value={form.email}
          onChange={(email) => setForm({ ...form, email })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Client type"
            value={form.clientType}
            onChange={(clientType) => changeClientType(clientType as ClientType)}
          >
            <option value="turf">Turf booking client</option>
            <option value="yoga">Yoga member</option>
            <option value="chess">Chess academy member</option>
            <option value="cricket">Cricket academy member</option>
          </Select>
          <Select
            label="Status"
            value={form.memberStatus}
            onChange={(memberStatus) =>
              setForm({ ...form, memberStatus: memberStatus as MemberStatus })
            }
          >
            <option value="demo">Demo / lead</option>
            <option value="active">Active member</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        {programs.length > 0 && (
          <Select
            label="Class / batch"
            value={form.programSlug}
            onChange={(programSlug) =>
              setForm({ ...form, programSlug: programSlug as AcademyProgramSlug })
            }
          >
            {programs.map((program) => (
              <option key={program.slug} value={program.slug}>
                {program.name} · {program.schedule}
              </option>
            ))}
          </Select>
        )}
        <TextArea
          label="Notes"
          value={form.notes}
          onChange={(notes) => setForm({ ...form, notes })}
          placeholder="Demo feedback, parent preferences, follow-up notes…"
        />
        <ActionButton type="submit" disabled={saving}>
          {saving && <LoaderCircle size={16} className="animate-spin" />}
          {contact ? "Save contact" : "Add contact"}
        </ActionButton>
      </form>
    </Modal>
  );
}

function ContactHistoryModal({
  contact,
  data,
  onClose,
  onEdit,
}: {
  contact: AdminContact;
  data: AdminData;
  onClose: () => void;
  onEdit: () => void;
}) {
  const bookings = data.bookings.filter((item) => item.phone === contact.phone);
  const invoices = data.invoices.filter((item) => item.phone === contact.phone);
  const transactions = data.transactions.filter((item) => item.phone === contact.phone);
  const program = getAcademyProgram(contact.programSlug);

  return (
    <Modal title={contact.name} onClose={onClose} size="large">
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Status value={contact.memberStatus} />
              <p className="mt-4 text-sm capitalize text-slate-400">
                {contact.clientType} client
              </p>
            </div>
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 text-xs font-bold text-green-300"
            >
              <Edit3 size={13} /> Edit
            </button>
          </div>
          <div className="mt-5 grid gap-3 text-sm">
            <a href={`tel:${contact.phone}`} className="flex items-center gap-3 text-slate-200">
              <Phone size={15} className="text-green-400" /> {contact.phone}
            </a>
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-slate-200">
                <Mail size={15} className="text-green-400" /> {contact.email}
              </a>
            )}
            {program && (
              <p className="flex items-start gap-3 text-slate-200">
                <Clock3 size={15} className="mt-0.5 text-green-400" />
                <span>
                  {program.name}
                  <span className="block text-xs text-slate-500">{program.schedule}</span>
                </span>
              </p>
            )}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <MetricMini label="Total spent" value={`₹${contact.totalSpent.toLocaleString("en-IN")}`} />
            <MetricMini label="Transactions" value={transactions.length} />
          </div>
          {contact.notes && (
            <div className="mt-5 rounded-xl bg-slate-950/70 p-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <NotebookTabs size={13} /> Notes
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {contact.notes}
              </p>
            </div>
          )}
          <p className="mt-5 text-xs text-slate-500">
            Contact since {contact.firstSeen} · Last activity {contact.lastSeen}
          </p>
        </aside>
        <div className="grid content-start gap-4">
          <HistorySection title={`Payments (${transactions.length})`}>
            {transactions.length ? transactions.map((item) => (
              <HistoryRow
                key={item.id}
                title={`${item.type} · ${item.source}`}
                meta={item.date}
                value={`₹${item.amount.toLocaleString("en-IN")}`}
                status={item.status}
              />
            )) : <EmptyState text="No payments recorded." />}
          </HistorySection>
          <HistorySection title={`Invoices (${invoices.length})`}>
            {invoices.length ? invoices.map((item) => (
              <HistoryRow
                key={item.id}
                title={`${item.invoiceNumber} · ${getAcademyProgram(item.programSlug)?.shortName ?? item.academyType}`}
                meta={item.invoiceDate}
                value={`₹${item.amount.toLocaleString("en-IN")}`}
                status={item.status}
              />
            )) : <EmptyState text="No invoices recorded." />}
          </HistorySection>
          <HistorySection title={`Turf bookings (${bookings.length})`}>
            {bookings.length ? bookings.map((item) => (
              <HistoryRow
                key={item.id}
                title={bookingTimeRange(item)}
                meta={item.date}
                value={`₹${item.totalPrice.toLocaleString("en-IN")}`}
                status={item.status}
              />
            )) : <EmptyState text="No turf bookings recorded." />}
          </HistorySection>
        </div>
      </div>
    </Modal>
  );
}

function HistorySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <h3 className="border-b border-white/10 px-4 py-3 text-sm font-bold">{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function HistoryRow({
  title,
  meta,
  value,
  status,
}: {
  title: string;
  meta: string;
  value: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-white/5 px-4 py-3 first:border-t-0">
      <div>
        <strong className="block text-sm">{title}</strong>
        <span className="mt-1 block text-xs text-slate-500">{meta}</span>
      </div>
      <div className="text-right">
        <strong className="block text-sm text-green-300">{value}</strong>
        <span className="mt-1 block text-xs capitalize text-slate-500">{status}</span>
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  size = "default",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "default" | "large";
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-label={title} className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl ${size === "large" ? "max-w-5xl" : "max-w-xl"}`}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-black">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="rounded-lg p-2 hover:bg-white/10"><X size={18} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
  flushTop = false,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  flushTop?: boolean;
}) {
  return (
    <section className={`${flushTop ? "" : "mt-7"} overflow-hidden rounded-2xl border border-white/10 bg-white/5`}>
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

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-300">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={1000}
        className={`${control} min-h-24 resize-y`}
      />
    </label>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="px-5 py-10 text-center text-sm text-slate-400">{text}</p>;
}

function exportTransactions(transactions: AdminTransaction[]) {
  const rows = [["Date", "Type", "Customer", "Phone", "Amount", "Source", "Status"], ...transactions.map((item) => [item.date, item.type, item.customerName, item.phone, String(item.amount), item.source, item.status])];
  downloadCsv("iplay-transactions.csv", rows);
}

function exportContacts(contacts: AdminContact[]) {
  const rows = [
    ["Name", "Phone", "Email", "Client type", "Batch", "Status", "Total spent", "Bookings", "Invoices", "Last seen", "Notes"],
    ...contacts.map((contact) => [
      contact.name,
      contact.phone,
      contact.email,
      contact.clientType,
      getAcademyProgram(contact.programSlug)?.name ?? "",
      contact.memberStatus,
      String(contact.totalSpent),
      String(contact.bookingCount),
      String(contact.invoiceCount),
      contact.lastSeen,
      contact.notes,
    ]),
  ];
  downloadCsv("iplay-contacts.csv", rows);
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
