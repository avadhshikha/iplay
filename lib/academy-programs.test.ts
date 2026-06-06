import { describe, expect, it } from "vitest";

import {
  academyPrograms,
  invoiceAmountForPlan,
  programOptionsForClientType,
} from "@/lib/academy-programs";

describe("academy programs", () => {
  it("defines the requested class fees and schedules", () => {
    expect(programOptionsForClientType("yoga")).toHaveLength(2);
    expect(academyPrograms.map((program) => [program.slug, program.monthlyFee])).toEqual([
      ["yoga_morning", 1200],
      ["yoga_women_evening", 1200],
      ["chess_evening", 1500],
      ["cricket_evening", 1500],
    ]);
  });

  it("adds the registration fee only to a new cricket registration", () => {
    expect(invoiceAmountForPlan("cricket_evening", "monthly")).toBe(1500);
    expect(invoiceAmountForPlan("cricket_evening", "new_registration")).toBe(2000);
    expect(invoiceAmountForPlan("chess_evening", "new_registration")).toBe(1500);
  });
});
