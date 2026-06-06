import { describe, expect, it } from "vitest";

import { calculateBookingPrice, getHourlyRate } from "@/lib/pricing";

describe("pricing", () => {
  it("uses weekday pricing", () => {
    expect(getHourlyRate("2026-06-08")).toBe(800);
    expect(calculateBookingPrice("2026-06-08", 3)).toBe(2400);
    expect(calculateBookingPrice("2026-06-08", 3.5)).toBe(2800);
  });

  it("uses weekend pricing", () => {
    expect(getHourlyRate("2026-06-07")).toBe(1000);
  });

  it("rejects invalid durations", () => {
    expect(() => calculateBookingPrice("2026-06-08", 0)).toThrow();
    expect(() => calculateBookingPrice("2026-06-08", 1.25)).toThrow();
    expect(() => calculateBookingPrice("2026-06-08", 6)).toThrow();
  });
});
