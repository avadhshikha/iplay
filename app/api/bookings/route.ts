import { NextRequest, NextResponse } from "next/server";

import { calculateBookingPrice, isWeekend } from "@/lib/pricing";
import {
  getEndTime,
  isSlotInPast,
  isValidBookingWindow,
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
  const result = await supabase
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
      day_type: isWeekend(booking.booking_date) ? "weekend" : "weekday",
      status: "confirmed",
      source: "online",
    })
    .select()
    .single();

  if (result.error) {
    const conflict = result.error.code === "23P01";
    return NextResponse.json(
      {
        error: conflict
          ? "Another booking already uses one or more of those slots."
          : "Could not save the booking.",
      },
      { status: conflict ? 409 : 500 },
    );
  }

  return NextResponse.json({ booking: result.data }, { status: 201 });
}
