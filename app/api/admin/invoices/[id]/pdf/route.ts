import { NextRequest, NextResponse } from "next/server";

import type { AdminInvoice } from "@/lib/admin-data";
import { createInvoicePdf } from "@/lib/invoice-pdf";
import {
  createSupabaseAdminClient,
  isSupabaseConfigured,
} from "@/lib/supabase/admin";

function isLocalAdminRequest() {
  return !(process.env.VERCEL === "1" && process.env.NODE_ENV === "production");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isLocalAdminRequest()) {
    return NextResponse.json(
      { error: "Invoice PDFs require admin authentication outside localhost." },
      { status: 401 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase environment variables are not configured." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const result = await supabase.from("invoices").select("*").eq("id", id).single();

  if (result.error || !result.data) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const row = result.data;
  const invoice: AdminInvoice = {
    id: row.id,
    invoiceNumber: row.invoice_number,
    customerName: row.customer_name,
    phone: row.customer_phone,
    email: row.customer_email ?? "",
    academyType: row.academy_type,
    programSlug: row.program_slug ?? "",
    feeKind: row.fee_kind ?? "monthly",
    description: row.description ?? "",
    amount: row.amount,
    invoiceDate: row.invoice_date,
    status: row.status,
  };
  const bytes = await createInvoicePdf(invoice);
  const disposition =
    request.nextUrl.searchParams.get("preview") === "1" ? "inline" : "attachment";

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${disposition}; filename="${invoice.invoiceNumber}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
