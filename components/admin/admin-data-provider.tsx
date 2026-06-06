"use client";

import { createContext, useContext, useState } from "react";

import { createDemoAdminData, type DemoAdminData } from "@/lib/demo-admin";

type AdminDataContextValue = {
  data: DemoAdminData;
  setData: React.Dispatch<React.SetStateAction<DemoAdminData>>;
};

const AdminDataContext = createContext<AdminDataContextValue | null>(null);

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DemoAdminData>(createDemoAdminData);

  return (
    <AdminDataContext.Provider value={{ data, setData }}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const value = useContext(AdminDataContext);

  if (!value) {
    throw new Error("useAdminData must be used inside AdminDataProvider.");
  }

  return value;
}
