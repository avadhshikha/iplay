import { getEndTime } from "@/lib/slots";

export type AdminBooking = {
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

export type AdminInvoice = {
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

export type AdminContact = {
  name: string;
  phone: string;
  email: string;
  type: string;
  totalSpent: number;
  invoiceCount: number;
  bookingCount: number;
  lastSeen: string;
};

export type AdminTransaction = {
  id: string;
  date: string;
  type: "turf" | "yoga" | "chess" | "cricket";
  customerName: string;
  phone: string;
  amount: number;
  source: "booking" | "invoice";
  status: "completed" | "pending" | "refunded";
};

export type AdminData = {
  bookings: AdminBooking[];
  invoices: AdminInvoice[];
  contacts: AdminContact[];
  transactions: AdminTransaction[];
};

export const emptyAdminData: AdminData = {
  bookings: [],
  invoices: [],
  contacts: [],
  transactions: [],
};

export function bookingTimeRange(booking: AdminBooking) {
  return `${booking.startTime}–${getEndTime(booking.startTime, booking.durationHours)}`;
}
