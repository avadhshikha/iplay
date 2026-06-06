import { addDays, format, subDays } from "date-fns";

import { calculateBookingPrice } from "@/lib/pricing";
import { getEndTime } from "@/lib/slots";

export type DemoBooking = {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  date: string;
  startTime: string;
  durationHours: number;
  totalPrice: number;
  source: "online" | "manual";
  status: "confirmed" | "pending" | "cancelled";
};

export type DemoInvoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  phone: string;
  email: string;
  academyType: "yoga" | "chess" | "cricket";
  description: string;
  amount: number;
  invoiceDate: string;
  status: "paid" | "pending" | "cancelled";
};

export type DemoAdminData = {
  bookings: DemoBooking[];
  invoices: DemoInvoice[];
};

export type DemoContact = {
  name: string;
  phone: string;
  email: string;
  type: string;
  totalSpent: number;
  invoiceCount: number;
  bookingCount: number;
  lastSeen: string;
};

export type DemoTransaction = {
  id: string;
  date: string;
  type: "turf" | "yoga" | "chess" | "cricket";
  customerName: string;
  phone: string;
  amount: number;
  source: "booking" | "invoice";
  status: "completed" | "pending" | "refunded";
};

function dateFromToday(offset: number) {
  return format(addDays(new Date(), offset), "yyyy-MM-dd");
}

export function createDemoAdminData(): DemoAdminData {
  return {
    bookings: [
      {
        id: "B-1001",
        customerName: "Rahul Sharma",
        phone: "9876543210",
        email: "rahul@example.com",
        date: dateFromToday(0),
        startTime: "18:30",
        durationHours: 2,
        totalPrice: calculateBookingPrice(dateFromToday(0), 2),
        source: "online",
        status: "confirmed",
      },
      {
        id: "B-1002",
        customerName: "Neha Kapoor",
        phone: "9876500011",
        email: "neha@example.com",
        date: dateFromToday(1),
        startTime: "19:30",
        durationHours: 1,
        totalPrice: calculateBookingPrice(dateFromToday(1), 1),
        source: "manual",
        status: "confirmed",
      },
      {
        id: "B-1003",
        customerName: "Arjun Mehta",
        phone: "9876500022",
        email: "",
        date: dateFromToday(3),
        startTime: "17:30",
        durationHours: 2,
        totalPrice: calculateBookingPrice(dateFromToday(3), 2),
        source: "online",
        status: "pending",
      },
      {
        id: "B-1004",
        customerName: "Rahul Sharma",
        phone: "9876543210",
        email: "rahul@example.com",
        date: format(subDays(new Date(), 4), "yyyy-MM-dd"),
        startTime: "20:30",
        durationHours: 1,
        totalPrice: calculateBookingPrice(dateFromToday(-4), 1),
        source: "online",
        status: "confirmed",
      },
    ],
    invoices: [
      {
        id: "I-1001",
        invoiceNumber: "INV-1001",
        customerName: "Priya Singh",
        phone: "9876500001",
        email: "priya@example.com",
        academyType: "yoga",
        description: "Monthly fee",
        amount: 2500,
        invoiceDate: dateFromToday(-2),
        status: "paid",
      },
      {
        id: "I-1002",
        invoiceNumber: "INV-1002",
        customerName: "Kabir Jain",
        phone: "9876500033",
        email: "",
        academyType: "chess",
        description: "Quarterly coaching fee",
        amount: 3600,
        invoiceDate: dateFromToday(-1),
        status: "pending",
      },
      {
        id: "I-1003",
        invoiceNumber: "INV-1003",
        customerName: "Neha Kapoor",
        phone: "9876500011",
        email: "neha@example.com",
        academyType: "cricket",
        description: "Cricket academy monthly fee",
        amount: 3000,
        invoiceDate: dateFromToday(0),
        status: "paid",
      },
    ],
  };
}

export function getDemoContacts(data: DemoAdminData): DemoContact[] {
  const contacts = new Map<string, DemoContact>();

  for (const booking of data.bookings.filter((item) => item.status !== "cancelled")) {
    const existing = contacts.get(booking.phone);
    contacts.set(booking.phone, {
      name: booking.customerName,
      phone: booking.phone,
      email: booking.email || existing?.email || "",
      type: existing?.type && existing.type !== "turf" ? "multiple" : "turf",
      totalSpent:
        (existing?.totalSpent ?? 0) +
        (booking.status === "confirmed" ? booking.totalPrice : 0),
      invoiceCount: existing?.invoiceCount ?? 0,
      bookingCount: (existing?.bookingCount ?? 0) + 1,
      lastSeen:
        !existing || booking.date > existing.lastSeen ? booking.date : existing.lastSeen,
    });
  }

  for (const invoice of data.invoices.filter((item) => item.status !== "cancelled")) {
    const existing = contacts.get(invoice.phone);
    contacts.set(invoice.phone, {
      name: invoice.customerName,
      phone: invoice.phone,
      email: invoice.email || existing?.email || "",
      type:
        existing?.type && existing.type !== invoice.academyType
          ? "multiple"
          : invoice.academyType,
      totalSpent:
        (existing?.totalSpent ?? 0) + (invoice.status === "paid" ? invoice.amount : 0),
      invoiceCount: (existing?.invoiceCount ?? 0) + 1,
      bookingCount: existing?.bookingCount ?? 0,
      lastSeen:
        !existing || invoice.invoiceDate > existing.lastSeen
          ? invoice.invoiceDate
          : existing.lastSeen,
    });
  }

  return [...contacts.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
}

export function getDemoTransactions(data: DemoAdminData): DemoTransaction[] {
  return [
    ...data.bookings.map((booking) => ({
      id: `T-${booking.id}`,
      date: booking.date,
      type: "turf" as const,
      customerName: booking.customerName,
      phone: booking.phone,
      amount: booking.totalPrice,
      source: "booking" as const,
      status:
        booking.status === "confirmed"
          ? ("completed" as const)
          : booking.status === "cancelled"
            ? ("refunded" as const)
            : ("pending" as const),
    })),
    ...data.invoices.map((invoice) => ({
      id: `T-${invoice.id}`,
      date: invoice.invoiceDate,
      type: invoice.academyType,
      customerName: invoice.customerName,
      phone: invoice.phone,
      amount: invoice.amount,
      source: "invoice" as const,
      status:
        invoice.status === "paid"
          ? ("completed" as const)
          : invoice.status === "cancelled"
            ? ("refunded" as const)
            : ("pending" as const),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

export function buildManualBooking(
  booking: Omit<DemoBooking, "id" | "totalPrice" | "source">,
): DemoBooking {
  return {
    ...booking,
    id: `B-${Date.now()}`,
    totalPrice: calculateBookingPrice(booking.date, booking.durationHours),
    source: "manual",
  };
}

export function buildInvoice(
  invoice: Omit<DemoInvoice, "id" | "invoiceNumber">,
  count: number,
): DemoInvoice {
  return {
    ...invoice,
    id: `I-${Date.now()}`,
    invoiceNumber: `INV-${1001 + count}`,
  };
}

export function bookingTimeRange(booking: DemoBooking) {
  return `${booking.startTime}–${getEndTime(booking.startTime, booking.durationHours)}`;
}
