import { describe, expect, it } from "vitest";

import {
  createDemoAdminData,
  getDemoContacts,
  getDemoTransactions,
} from "@/lib/demo-admin";

describe("demo admin data", () => {
  it("derives contacts from bookings and invoices", () => {
    const contacts = getDemoContacts(createDemoAdminData());
    const neha = contacts.find((contact) => contact.phone === "9876500011");

    expect(neha).toMatchObject({
      name: "Neha Kapoor",
      type: "multiple",
      bookingCount: 1,
      invoiceCount: 1,
    });
  });

  it("keeps pending payments out of completed revenue", () => {
    const transactions = getDemoTransactions(createDemoAdminData());
    const kabir = transactions.find((transaction) => transaction.phone === "9876500033");

    expect(kabir?.status).toBe("pending");
  });
});
