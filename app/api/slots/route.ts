import { NextRequest, NextResponse } from "next/server";

import { getHourlyRate } from "@/lib/pricing";
import {
  createDemoSlots,
  formatSlotLabel,
  generateSlotTimes,
  isSlotInPast,
  rangesOverlap,
} from "@/lib/slots";
import {
  createSupabaseAdminClient,
  isSupabaseConfigured,
} from "@/lib/supabase/admin";
import type { SlotAvailability } from "@/lib/types";
import { dateOnlySchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const parsedDate = dateOnlySchema.safeParse(
    request.nextUrl.searchParams.get("date"),
  );

  if (!parsedDate.success) {
    return NextResponse.json({ error: "A valid date is required." }, { status: 400 });
  }

  const date = parsedDate.data;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      slots: createDemoSlots(date),
      mode: "demo",
    });
  }

  const supabase = createSupabaseAdminClient();
  const [bookingsResult, blocksResult] = await Promise.all([
    supabase
      .from("bookings")
      .select("start_time,end_time")
      .eq("booking_date", date)
      .eq("status", "confirmed"),
    supabase
      .from("slots_config")
      .select("blocked_start,blocked_end")
      .eq("blocked_date", date),
  ]);

  if (bookingsResult.error || blocksResult.error) {
    return NextResponse.json(
      { error: "Could not load availability." },
      { status: 500 },
    );
  }

  const price = getHourlyRate(date);
  const slots: SlotAvailability[] = generateSlotTimes().map((time) => {
    const endTime = `${String(Number(time.slice(0, 2)) + 1).padStart(2, "0")}:${time.slice(3, 5)}`;
    const booked = bookingsResult.data.some((booking) =>
      rangesOverlap(time, endTime, booking.start_time, booking.end_time),
    );
    const blocked = blocksResult.data.some(
      (block) =>
        !block.blocked_start ||
        !block.blocked_end ||
        rangesOverlap(time, endTime, block.blocked_start, block.blocked_end),
    );

    return {
      time,
      label: formatSlotLabel(time),
      available: !booked && !blocked && !isSlotInPast(date, time),
      price,
    };
  });

  return NextResponse.json({ slots, mode: "live" });
}
