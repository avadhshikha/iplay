import { describe, expect, it } from "vitest";

import type { AdminInvoice } from "@/lib/admin-data";
import { createInvoicePdf } from "@/lib/invoice-pdf";

describe("invoice PDF", () => {
  it("creates a valid one-page PDF", async () => {
    const invoice: AdminInvoice = {
      id: "invoice-id",
      invoiceNumber: "INV-1001",
      customerName: "Priya Singh",
      phone: "9876500001",
      email: "priya@example.com",
      academyType: "yoga",
      programSlug: "yoga_morning",
      feeKind: "monthly",
      description: "Monthly yoga coaching fee",
      amount: 2500,
      invoiceDate: "2026-06-07",
      status: "paid",
    };

    const bytes = await createInvoicePdf(invoice);
    const signature = new TextDecoder().decode(bytes.slice(0, 5));

    expect(signature).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(2000);
  });
});
