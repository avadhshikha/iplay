import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import type {
  AdminBooking,
  AdminContact,
  AdminData,
  AdminInvoice,
  AdminTransaction,
} from "@/lib/admin-data";
import { calculateBookingPrice, isWeekend } from "@/lib/pricing";
import { getEndTime, isValidBookingWindow, rangesOverlap } from "@/lib/slots";
import {
  createSupabaseAdminClient,
  isSupabaseConfigured,
} from "@/lib/supabase/admin";
import { bookingRequestSchema, dateOnlySchema } from "@/lib/validation";

const manualBookingSchema = bookingRequestSchema
  .omit({ notes: true })
  .extend({
    status: z.enum(["confirmed", "pending"]),
  });

const invoiceSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  email: z.string().email().optional().or(z.literal("")),
  academyType: z.enum(["yoga", "chess", "cricket"]),
  description: z.string().trim().max(300),
  amount: z.number().int().positive(),
  invoiceDate: dateOnlySchema,
  status: z.enum(["paid", "pending"]),
});

function unavailable() {
  return NextResponse.json(
    { error: "Supabase environment variables are not configured." },
    { status: 503 },
  );
}

function isLocalAdminRequest() {
  return !(process.env.VERCEL === "1" && process.env.NODE_ENV === "production");
}

function unauthorized() {
  return NextResponse.json(
    {
      error:
        "Live admin access is currently limited to localhost until admin authentication is configured.",
    },
    { status: 401 },
  );
}

export async function GET() {
  if (!isLocalAdminRequest()) return unauthorized();
  if (!isSupabaseConfigured()) return unavailable();

  const supabase = createSupabaseAdminClient();
  const [bookings, invoices, contacts, transactions] = await Promise.all([
    supabase.from("bookings").select("*").order("booking_date", { ascending: false }),
    supabase.from("invoices").select("*").order("invoice_date", { ascending: false }),
    supabase.from("contacts").select("*").order("last_seen", { ascending: false }),
    supabase
      .from("transactions")
      .select("*")
      .order("transaction_date", { ascending: false }),
  ]);
  const error = bookings.error || invoices.error || contacts.error || transactions.error;

  if (error) {
    return NextResponse.json(
      { error: `Supabase could not load admin data: ${error.message}` },
      { status: 500 },
    );
  }

  const data: AdminData = {
    bookings: bookings.data.map(
      (row): AdminBooking => ({
        id: row.id,
        customerName: row.customer_name,
        phone: row.customer_phone,
        email: row.customer_email ?? "",
        date: row.booking_date,
        startTime: row.start_time.slice(0, 5),
        durationHours: row.duration_hours,
        totalPrice: row.total_price,
        source: row.source,
        status: row.status,
      }),
    ),
    invoices: invoices.data.map(
      (row): AdminInvoice => ({
        id: row.id,
        invoiceNumber: row.invoice_number,
        customerName: row.customer_name,
        phone: row.customer_phone,
        email: row.customer_email ?? "",
        academyType: row.academy_type,
        description: row.description ?? "",
        amount: row.amount,
        invoiceDate: row.invoice_date,
        status: row.status,
      }),
    ),
    contacts: contacts.data.map(
      (row): AdminContact => ({
        name: row.name,
        phone: row.phone,
        email: row.email ?? "",
        type: row.type ?? "",
        totalSpent: row.total_spent,
        invoiceCount: row.invoice_count,
        bookingCount: row.booking_count,
        lastSeen: row.last_seen.slice(0, 10),
      }),
    ),
    transactions: transactions.data.map(
      (row): AdminTransaction => ({
        id: row.id,
        date: row.transaction_date,
        type: row.type,
        customerName: row.customer_name,
        phone: row.customer_phone ?? "",
        amount: row.amount,
        source: row.reference_type,
        status: row.status,
      }),
    ),
  };

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  if (!isLocalAdminRequest()) return unauthorized();
  if (!isSupabaseConfigured()) return unavailable();

  const body = await request.json();
  const supabase = createSupabaseAdminClient();

  if (body.resource === "booking") {
    const parsed = manualBookingSchema.safeParse({
      customer_name: body.booking?.customerName,
      customer_phone: body.booking?.phone,
      customer_email: body.booking?.email,
      booking_date: body.booking?.date,
      start_time: body.booking?.startTime,
      duration_hours: body.booking?.durationHours,
      status: body.booking?.status,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Please check the booking details." }, { status: 400 });
    }

    const booking = parsed.data;
    const endTime = getEndTime(booking.start_time, booking.duration_hours);

    if (!isValidBookingWindow(booking.start_time, booking.duration_hours)) {
      return NextResponse.json({ error: "Booking exceeds operating hours." }, { status: 400 });
    }

    const [conflicts, blocks] = await Promise.all([
      supabase
        .from("bookings")
        .select("start_time,end_time")
        .eq("booking_date", booking.booking_date)
        .eq("status", "confirmed"),
      supabase
        .from("slots_config")
        .select("blocked_start,blocked_end")
        .eq("blocked_date", booking.booking_date),
    ]);

    if (conflicts.error || blocks.error) {
      return NextResponse.json({ error: "Could not verify availability." }, { status: 500 });
    }

    if (
      conflicts.data?.some((row) =>
        rangesOverlap(booking.start_time, endTime, row.start_time, row.end_time),
      ) ||
      blocks.data?.some(
        (row) =>
          !row.blocked_start ||
          !row.blocked_end ||
          rangesOverlap(booking.start_time, endTime, row.blocked_start, row.blocked_end),
      )
    ) {
      return NextResponse.json(
        { error: "Those slots are already booked or blocked." },
        { status: 409 },
      );
    }

    const hourlyRate = calculateBookingPrice(booking.booking_date, 1);
    const result = await supabase.from("bookings").insert({
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      customer_email: booking.customer_email || null,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      duration_hours: booking.duration_hours,
      end_time: endTime,
      price_per_hour: hourlyRate,
      total_price: calculateBookingPrice(booking.booking_date, booking.duration_hours),
      day_type: isWeekend(booking.booking_date) ? "weekend" : "weekday",
      status: booking.status,
      source: "manual",
    });

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (body.resource === "invoice") {
    const parsed = invoiceSchema.safeParse(body.invoice);

    if (!parsed.success) {
      return NextResponse.json({ error: "Please check the invoice details." }, { status: 400 });
    }

    const invoice = parsed.data;
    const result = await supabase.from("invoices").insert({
      customer_name: invoice.customerName,
      customer_phone: invoice.phone,
      customer_email: invoice.email || null,
      academy_type: invoice.academyType,
      description: invoice.description || null,
      amount: invoice.amount,
      invoice_date: invoice.invoiceDate,
      status: invoice.status,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  }

  return NextResponse.json({ error: "Unknown admin resource." }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  if (!isLocalAdminRequest()) return unauthorized();
  if (!isSupabaseConfigured()) return unavailable();

  const body = await request.json();
  const supabase = createSupabaseAdminClient();

  if (body.resource === "booking" && body.status === "cancelled") {
    const result = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", body.id);
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    const transaction = await supabase
      .from("transactions")
      .update({ status: "refunded" })
      .eq("reference_type", "booking")
      .eq("reference_id", body.id);
    if (transaction.error) {
      return NextResponse.json({ error: transaction.error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (
    body.resource === "invoice" &&
    ["paid", "pending", "cancelled"].includes(body.status)
  ) {
    const result = await supabase
      .from("invoices")
      .update({ status: body.status })
      .eq("id", body.id);
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    const transaction = await supabase
      .from("transactions")
      .update({
        status:
          body.status === "paid"
            ? "completed"
            : body.status === "cancelled"
              ? "refunded"
              : "pending",
      })
      .eq("reference_type", "invoice")
      .eq("reference_id", body.id);
    if (transaction.error) {
      return NextResponse.json({ error: transaction.error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown admin update." }, { status: 400 });
}
