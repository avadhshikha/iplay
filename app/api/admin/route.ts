import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import type {
  AdminBooking,
  AdminContact,
  AdminData,
  AdminInvoice,
  AdminTransaction,
} from "@/lib/admin-data";
import {
  academyPrograms,
  getAcademyProgram,
  invoiceAmountForPlan,
} from "@/lib/academy-programs";
import { decodeContactNotes, encodeContactNotes } from "@/lib/contact-metadata";
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
  programSlug: z.enum([
    "yoga_morning",
    "yoga_women_evening",
    "chess_evening",
    "cricket_evening",
  ]),
  feeKind: z.enum(["monthly", "new_registration", "other"]),
  description: z.string().trim().max(300),
  amount: z.number().int().positive(),
  invoiceDate: dateOnlySchema,
  status: z.enum(["paid", "pending"]),
}).superRefine((invoice, context) => {
  const program = getAcademyProgram(invoice.programSlug);
  if (!program || program.category !== invoice.academyType) {
    context.addIssue({
      code: "custom",
      path: ["programSlug"],
      message: "The selected batch does not match the academy.",
    });
  }
  if (invoice.feeKind === "new_registration" && !program?.registrationFee) {
    context.addIssue({
      code: "custom",
      path: ["feeKind"],
      message: "Registration fees are only configured for Cricket Academy.",
    });
  }
});

const contactSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(100),
    phone: z.string().regex(/^[6-9]\d{9}$/),
    email: z.string().email().optional().or(z.literal("")),
    clientType: z.enum(["turf", "yoga", "chess", "cricket"]),
    programSlug: z
      .enum([
        "yoga_morning",
        "yoga_women_evening",
        "chess_evening",
        "cricket_evening",
      ])
      .optional()
      .or(z.literal("")),
    memberStatus: z.enum(["demo", "active", "inactive"]),
    notes: z.string().trim().max(1000),
  })
  .superRefine((contact, context) => {
    if (contact.clientType !== "turf" && !contact.programSlug) {
      context.addIssue({
        code: "custom",
        path: ["programSlug"],
        message: "Please select an academy batch.",
      });
    }
    const program = academyPrograms.find(
      (item) => item.slug === contact.programSlug,
    );
    if (program && program.category !== contact.clientType) {
      context.addIssue({
        code: "custom",
        path: ["programSlug"],
        message: "The selected batch does not match the client type.",
      });
    }
  });

function isCompatibilityError(error: { code?: string; message: string }) {
  return (
    error.code === "PGRST204" ||
    error.message.includes("client_type") ||
    error.message.includes("program_slug") ||
    error.message.includes("member_status") ||
    error.message.includes("fee_kind")
  );
}

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
        programSlug: row.program_slug ?? "",
        feeKind: row.fee_kind ?? "monthly",
        description: row.description ?? "",
        amount: row.amount,
        invoiceDate: row.invoice_date,
        status: row.status,
      }),
    ),
    contacts: contacts.data.map(
      (row): AdminContact => {
        const fallback = decodeContactNotes(row.notes);
        return {
          id: row.id,
          name: row.name,
          phone: row.phone,
          email: row.email ?? "",
          clientType:
            row.client_type ??
            (row.type === "multiple" || !row.type ? "turf" : row.type),
          programSlug: row.program_slug ?? fallback.programSlug,
          memberStatus: row.member_status ?? fallback.memberStatus,
          notes: fallback.notes,
          totalSpent: row.total_spent,
          invoiceCount: row.invoice_count,
          bookingCount: row.booking_count,
          firstSeen: row.first_seen.slice(0, 10),
          lastSeen: row.last_seen.slice(0, 10),
        };
      },
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
    const amount =
      invoice.feeKind === "other"
        ? invoice.amount
        : invoiceAmountForPlan(invoice.programSlug, invoice.feeKind);
    const result = await supabase.from("invoices").insert({
      customer_name: invoice.customerName,
      customer_phone: invoice.phone,
      customer_email: invoice.email || null,
      academy_type: invoice.academyType,
      program_slug: invoice.programSlug,
      fee_kind: invoice.feeKind,
      description: invoice.description || null,
      amount,
      invoice_date: invoice.invoiceDate,
      status: invoice.status,
    });

    if (result.error && isCompatibilityError(result.error)) {
      const fallback = await supabase.from("invoices").insert({
        customer_name: invoice.customerName,
        customer_phone: invoice.phone,
        customer_email: invoice.email || null,
        academy_type: invoice.academyType,
        description: invoice.description || null,
        amount,
        invoice_date: invoice.invoiceDate,
        status: invoice.status,
      });
      if (!fallback.error) return NextResponse.json({ ok: true }, { status: 201 });
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (body.resource === "contact") {
    const parsed = contactSchema.safeParse(body.contact);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Please check the contact details." },
        { status: 400 },
      );
    }

    const contact = parsed.data;
    const result = await supabase.from("contacts").insert({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || null,
      type: contact.clientType,
      client_type: contact.clientType,
      program_slug: contact.programSlug || null,
      member_status: contact.memberStatus,
      notes: contact.notes || null,
    });

    if (result.error && isCompatibilityError(result.error)) {
      const fallback = await supabase.from("contacts").insert({
        name: contact.name,
        phone: contact.phone,
        email: contact.email || null,
        type: contact.clientType,
        notes: encodeContactNotes(contact),
      });
      if (!fallback.error) return NextResponse.json({ ok: true }, { status: 201 });
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }

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

  if (body.resource === "contact") {
    const parsed = contactSchema.safeParse(body.contact);
    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json(
        { error: parsed.error?.issues[0]?.message ?? "Please check the contact details." },
        { status: 400 },
      );
    }

    const contact = parsed.data;
    const result = await supabase
      .from("contacts")
      .update({
        name: contact.name,
        phone: contact.phone,
        email: contact.email || null,
        type: contact.clientType,
        client_type: contact.clientType,
        program_slug: contact.programSlug || null,
        member_status: contact.memberStatus,
        notes: contact.notes || null,
      })
      .eq("id", contact.id);

    if (result.error && isCompatibilityError(result.error)) {
      const fallback = await supabase
        .from("contacts")
        .update({
          name: contact.name,
          phone: contact.phone,
          email: contact.email || null,
          type: contact.clientType,
          notes: encodeContactNotes(contact),
        })
        .eq("id", contact.id);
      if (!fallback.error) return NextResponse.json({ ok: true });
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown admin update." }, { status: 400 });
}
