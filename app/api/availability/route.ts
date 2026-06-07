import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  createDemoSlots,
  createSlotsForDate,
  enumerateDateRange,
  getIndiaNowParts,
} from "@/lib/slots";
import {
  createSupabaseAdminClient,
  isSupabaseConfigured,
} from "@/lib/supabase/admin";
import type { DateAvailability } from "@/lib/types";
import { dateOnlySchema } from "@/lib/validation";

const availabilityRangeSchema = z
  .object({
    from: dateOnlySchema,
    to: dateOnlySchema,
  })
  .superRefine(({ from, to }, context) => {
    const dates = enumerateDateRange(from, to);
    if (from > to || dates.length > 70) {
      context.addIssue({
        code: "custom",
        message: "Availability can be requested for up to 70 consecutive days.",
      });
    }
  });

export async function GET(request: NextRequest) {
  const parsed = availabilityRangeSchema.safeParse({
    from: request.nextUrl.searchParams.get("from"),
    to: request.nextUrl.searchParams.get("to"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "A valid availability date range is required." },
      { status: 400 },
    );
  }

  const today = getIndiaNowParts().date;
  const from = parsed.data.from < today ? today : parsed.data.from;
  const to = parsed.data.to;
  const dates = enumerateDateRange(from, to);

  if (!isSupabaseConfigured()) {
    const availability: DateAvailability[] = dates.map((date) => ({
      date,
      availableSlots: createDemoSlots(date).filter((slot) => slot.available).length,
    }));
    return NextResponse.json({ availability, mode: "demo" });
  }

  const supabase = createSupabaseAdminClient();
  const [bookingsResult, blocksResult] = await Promise.all([
    supabase
      .from("bookings")
      .select("booking_date,start_time,end_time")
      .gte("booking_date", from)
      .lte("booking_date", to)
      .eq("status", "confirmed"),
    supabase
      .from("slots_config")
      .select("blocked_date,blocked_start,blocked_end")
      .gte("blocked_date", from)
      .lte("blocked_date", to),
  ]);

  if (bookingsResult.error || blocksResult.error) {
    return NextResponse.json(
      { error: "Could not load date availability." },
      { status: 500 },
    );
  }

  const availability: DateAvailability[] = dates.map((date) => ({
    date,
    availableSlots: createSlotsForDate(
      date,
      bookingsResult.data.filter((booking) => booking.booking_date === date),
      blocksResult.data.filter((block) => block.blocked_date === date),
    ).filter((slot) => slot.available).length,
  }));

  return NextResponse.json({ availability, mode: "live" });
}
