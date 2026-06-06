import { describe, expect, it } from "vitest";

import {
  CLOSING_TIME,
  generateSlotTimes,
  getEndTime,
  isValidBookingWindow,
  rangesOverlap,
} from "@/lib/slots";

describe("slots", () => {
  it("generates 14 hourly slots through the 10:30 PM start", () => {
    const slots = generateSlotTimes();
    expect(slots).toHaveLength(14);
    expect(slots[0]).toBe("09:30");
    expect(slots.at(-1)).toBe("22:30");
    expect(getEndTime(slots.at(-1)!, 1)).toBe(CLOSING_TIME);
  });

  it("only accepts booking windows inside operating hours", () => {
    expect(isValidBookingWindow("09:30", 5)).toBe(true);
    expect(isValidBookingWindow("22:30", 1)).toBe(true);
    expect(isValidBookingWindow("22:30", 2)).toBe(false);
  });

  it("detects overlaps without treating adjacent slots as overlaps", () => {
    expect(rangesOverlap("10:30", "12:30", "11:30", "12:30")).toBe(true);
    expect(rangesOverlap("10:30", "11:30", "11:30", "12:30")).toBe(false);
  });
});
