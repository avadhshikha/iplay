import { describe, expect, it } from "vitest";

import { dateOnlySchema } from "@/lib/validation";

describe("date validation", () => {
  it("accepts real dates and rejects calendar overflow dates", () => {
    expect(dateOnlySchema.safeParse("2026-02-28").success).toBe(true);
    expect(dateOnlySchema.safeParse("2026-02-29").success).toBe(false);
    expect(dateOnlySchema.safeParse("2026-13-01").success).toBe(false);
  });
});
