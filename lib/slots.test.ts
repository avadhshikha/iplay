import { describe, expect, it } from "vitest";

import {
  CLOSING_TIME,
  formatDuration,
  generateDurations,
  generateSlotTimes,
  getEndTime,
  isValidBookingWindow,
  rangesOverlap,
} from "@/lib/slots";

describe("slots", () => {
  it("generates half-hour slots through the 11:00 PM start", () => {
    const slots = generateSlotTimes();
    expect(slots).toHaveLength(28);
    expect(slots[0]).toBe("09:30");
    expect(slots[1]).toBe("10:00");
    expect(slots.at(-1)).toBe("23:00");
    expect(getEndTime(slots.at(-1)!, 0.5)).toBe(CLOSING_TIME);
  });

  it("only accepts booking windows inside operating hours", () => {
    expect(isValidBookingWindow("09:30", 5)).toBe(true);
    expect(isValidBookingWindow("10:00", 3.5)).toBe(true);
    expect(isValidBookingWindow("23:00", 0.5)).toBe(true);
    expect(isValidBookingWindow("22:30", 2)).toBe(false);
  });

  it("detects overlaps without treating adjacent slots as overlaps", () => {
    expect(rangesOverlap("10:30", "12:30", "11:30", "12:30")).toBe(true);
    expect(rangesOverlap("10:30", "11:30", "11:30", "12:30")).toBe(false);
  });

  it("formats the flexible duration choices clearly", () => {
    expect(generateDurations()).toContain(3.5);
    expect(formatDuration(0.5)).toBe("30 min");
    expect(formatDuration(3.5)).toBe("3 hr 30 min");
  });
});
