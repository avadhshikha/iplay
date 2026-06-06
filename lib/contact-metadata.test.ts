import { describe, expect, it } from "vitest";

import { decodeContactNotes, encodeContactNotes } from "@/lib/contact-metadata";

describe("contact metadata compatibility", () => {
  it("stores and restores CRM fields in legacy contact notes", () => {
    const encoded = encodeContactNotes({
      programSlug: "yoga_women_evening",
      memberStatus: "demo",
      notes: "Loved the trial class.",
    });

    expect(decodeContactNotes(encoded)).toEqual({
      programSlug: "yoga_women_evening",
      memberStatus: "demo",
      notes: "Loved the trial class.",
    });
  });
});
