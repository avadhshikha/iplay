import { NextRequest, NextResponse } from "next/server";

import { calculateBookingPrice, isWeekend } from "@/lib/pricing";
import {
  getEndTime,
  isSlotInPast,
  isValidBookingWindow,
  rangesOverlap,
} from "@/lib/slots";
import {
  createSupabaseAdminClient,
  isSupabaseConfigured,
} from "@/lib/supabase/admin";
import { bookingRequestSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const parsed = bookingRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check your booking details.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const booking = parsed.data;

  if (
    isSlotInPast(booking.booking_date, booking.start_time) ||
    !isValidBookingWindow(booking.start_time, booking.duration_hours)
  ) {
    return NextResponse.json(
      { error: "That booking time is not available." },
      { status: 400 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not connected yet. Availability is currently in demo mode." },
      { status: 503 },
    );
  }

  const endTime = getEndTime(booking.start_time, booking.duration_hours);
  const pricePerHour = calculateBookingPrice(booking.booking_date, 1);
  const supabase = createSupabaseAdminClient();
  const [bookings, blocks] = await Promise.all([
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

  if (bookings.error || blocks.error) {
    return NextResponse.json({ error: "Could not verify availability." }, { status: 500 });
  }

  const hasConflict = bookings.data.some((row) =>
    rangesOverlap(booking.start_time, endTime, row.start_time, row.end_time),
  );
  const isBlocked = blocks.data.some(
    (row) =>
      !row.blocked_start ||
      !row.blocked_end ||
      rangesOverlap(booking.start_time, endTime, row.blocked_start, row.blocked_end),
  );

  if (hasConflict || isBlocked) {
    return NextResponse.json(
      { error: "Another booking or block already uses one or more of those slots." },
      { status: 409 },
    );
  }

  let result = await supabase
    .from("bookings")
    .insert({
      ...booking,
      customer_email: booking.customer_email || null,
      notes: booking.notes || null,
      end_time: endTime,
      price_per_hour: pricePerHour,
      total_price: calculateBookingPrice(
        booking.booking_date,
        booking.duration_hours,
      ),
      payment_mode: booking.payment_mode,
      day_type: isWeekend(booking.booking_date) ? "weekend" : "weekday",
      status: "confirmed",
      source: "online",
    })
    .select()
    .single();

  if (result.error?.message.includes("payment_mode")) {
    const { payment_mode: _paymentMode, ...legacyBooking } = booking;
    void _paymentMode;
    result = await supabase
      .from("bookings")
      .insert({
        ...legacyBooking,
        customer_email: booking.customer_email || null,
        notes: booking.notes || null,
        end_time: endTime,
        price_per_hour: pricePerHour,
        total_price: calculateBookingPrice(booking.booking_date, booking.duration_hours),
        day_type: isWeekend(booking.booking_date) ? "weekend" : "weekday",
        status: "confirmed",
        source: "online",
      })
      .select()
      .single();
  }

  if (result.error) {
    const conflict = result.error.code === "23P01";
    const migrationRequired =
      !Number.isInteger(booking.duration_hours) &&
      (result.error.message.includes("duration_hours") ||
        result.error.message.includes("smallint") ||
        result.error.message.includes("invalid input syntax"));
    return NextResponse.json(
      {
        error: migrationRequired
          ? "Flexible booking durations need the latest Supabase migration."
          : conflict
            ? "Another booking already uses one or more of those slots."
            : "Could not save the booking.",
      },
      { status: conflict ? 409 : migrationRequired ? 503 : 500 },
    );
  }

  return NextResponse.json({ booking: result.data }, { status: 201 });
}
