import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { InvoiceModel } from "@/models/invoice";
import { InvoiceItemModel } from "@/models/invoiceItem";
import { BusinessModel } from "@/models/business";

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

  return NextResponse.json({ invoice, items, business });
}
