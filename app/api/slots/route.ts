import { NextRequest, NextResponse } from "next/server";

import {
  createDemoSlots,
  createSlotsForDate,
} from "@/lib/slots";
import {
  createSupabaseAdminClient,
  isSupabaseConfigured,
} from "@/lib/supabase/admin";
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

  const slots = createSlotsForDate(date, bookingsResult.data, blocksResult.data);

  return NextResponse.json({ slots, mode: "live" });
}
