import { NextResponse } from "next/server";
import { requireCashierAccess } from "@/lib/access";
import { connectToDatabase } from "@/lib/db";
import { z } from "zod";
import { recordPayment } from "@/services/paymentService";

const bodySchema = z.object({
  amount: z.number().positive(),
  method: z.enum(["cash", "card", "upi", "bank_transfer", "cheque", "other"]),
  reference: z.string().optional(),
  paidAt: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(
  request: Request,
  context: any
) {
  const access = await requireCashierAccess();
  if (access.error) {
    return access.error;
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  await connectToDatabase();

  const params = await context.params;
  const result = await recordPayment({
    businessId: access.session.user.businessId as string,
    invoiceId: params.invoiceId,
    amount: parsed.data.amount,
    method: parsed.data.method,
    reference: parsed.data.reference ?? null,
    paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : undefined,
    createdBy: access.session.user.id ?? null,
    notes: parsed.data.notes ?? null,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, payment: result.payment, invoice: result.invoice });
}

export async function GET(
  _request: Request,
  context: any
) {
  const access = await requireCashierAccess();
  if (access.error) {
    return access.error;
  }

  await connectToDatabase();

  const params = await context.params;
  const payments = await (await import("@/models/payment")).PaymentModel.find({
    invoiceId: params.invoiceId,
    businessId: access.session.user.businessId,
    isDeleted: false,
  }).sort({ paidAt: -1 }).lean();

  return NextResponse.json({ ok: true, payments });
}
