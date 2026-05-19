import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { InvoiceModel } from "@/models/invoice";
import { InvoiceItemModel } from "@/models/invoiceItem";
import { BusinessModel } from "@/models/business";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { InvoicePdf } from "@/modules/invoices/InvoicePdf";
import QRCode from "qrcode";
import { buildInvoiceQrPayload } from "@/utils/invoiceQr";

export async function GET(
  _request: Request,
  context: any
) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const params = await context.params;
  const invoice = await InvoiceModel.findOne({
    _id: params.invoiceId,
    businessId: session.user.businessId,
    isDeleted: false,
  }).lean();

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [items, business] = await Promise.all([
    InvoiceItemModel.find({
      invoiceId: invoice._id,
      businessId: session.user.businessId,
      isDeleted: false,
    }).lean(),
    BusinessModel.findOne({
      businessId: session.user.businessId,
      isDeleted: false,
    }).lean(),
  ]);

  const qrPayload = buildInvoiceQrPayload(
    invoice as Parameters<typeof buildInvoiceQrPayload>[0],
    business as Parameters<typeof buildInvoiceQrPayload>[1]
  );
  const invoiceQrDataUrl = await QRCode.toDataURL(qrPayload, {
    margin: 1,
    width: 144,
  });

  const element = React.createElement(InvoicePdf, {
    invoice,
    items,
    business,
    invoiceQrDataUrl,
  });
  const buffer = await renderToBuffer(element as React.ReactElement<any>);

  return new NextResponse(buffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`,
    },
  });
}
