import { notFound } from "next/navigation";

import {
  AdminConsole,
  type AdminSection,
} from "@/components/admin/admin-console";

const sections: AdminSection[] = [
  "bookings",
  "invoices",
  "contacts",
  "transactions",
  "analytics",
];

export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!sections.includes(section as AdminSection)) notFound();

  return <AdminConsole section={section as AdminSection} />;
}
