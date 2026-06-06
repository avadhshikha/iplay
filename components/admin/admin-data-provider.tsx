"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import {
  emptyAdminData,
  type AdminBooking,
  type AdminContact,
  type AdminData,
  type AdminInvoice,
  type AdminTransaction,
} from "@/lib/admin-data";

type AdminDataContextValue = {
  data: AdminData;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createBooking: (
    booking: Omit<AdminBooking, "id" | "totalPrice" | "source">,
  ) => Promise<void>;
  cancelBooking: (id: string) => Promise<void>;
  createInvoice: (
    invoice: Omit<AdminInvoice, "id" | "invoiceNumber">,
  ) => Promise<void>;
  updateInvoiceStatus: (id: string, status: AdminInvoice["status"]) => Promise<void>;
  createContact: (
    contact: Omit<
      AdminContact,
      "id" | "totalSpent" | "invoiceCount" | "bookingCount" | "firstSeen" | "lastSeen"
    >,
  ) => Promise<void>;
  updateContact: (contact: AdminContact) => Promise<void>;
  updateTransactionPaymentMode: (
    id: string,
    paymentMode: AdminTransaction["paymentMode"],
  ) => Promise<void>;
};

const AdminDataContext = createContext<AdminDataContextValue | null>(null);

async function requestAdmin(
  method: "POST" | "PATCH",
  body: Record<string, unknown>,
) {
  const response = await fetch("/api/admin", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "The admin action failed.");
  }
}

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AdminData>(emptyAdminData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error ?? "Could not load Supabase data.");

      setData(payload.data);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load Supabase data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    fetch("/api/admin", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Could not load Supabase data.");
        return payload.data as AdminData;
      })
      .then((loadedData) => {
        if (active) {
          setData(loadedData);
          setError(null);
        }
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Could not load Supabase data.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function runAction(method: "POST" | "PATCH", body: Record<string, unknown>) {
    setError(null);
    try {
      await requestAdmin(method, body);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The admin action failed.");
      throw caught;
    }
  }

  return (
    <AdminDataContext.Provider
      value={{
        data,
        loading,
        error,
        refresh,
        createBooking: (booking) => runAction("POST", { resource: "booking", booking }),
        cancelBooking: (id) =>
          runAction("PATCH", { resource: "booking", id, status: "cancelled" }),
        createInvoice: (invoice) => runAction("POST", { resource: "invoice", invoice }),
        updateInvoiceStatus: (id, status) =>
          runAction("PATCH", { resource: "invoice", id, status }),
        createContact: (contact) => runAction("POST", { resource: "contact", contact }),
        updateContact: (contact) => runAction("PATCH", { resource: "contact", contact }),
        updateTransactionPaymentMode: (id, paymentMode) =>
          runAction("PATCH", { resource: "transaction", id, paymentMode }),
      }}
    >
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const value = useContext(AdminDataContext);

  if (!value) throw new Error("useAdminData must be used inside AdminDataProvider.");

  return value;
}
