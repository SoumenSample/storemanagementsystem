import { PaymentModel } from "@/models/payment";
import { InvoiceModel } from "@/models/invoice";

export async function recordPayment(params: {
  businessId: string;
  invoiceId: string;
  amount: number;
  method: "cash" | "card" | "upi" | "bank_transfer" | "cheque" | "other";
  reference?: string | null;
  paidAt?: Date;
  createdBy?: string | null;
  notes?: string | null;
  gatewayResponse?: any;
}) {
  const invoice = await InvoiceModel.findOne({
    _id: params.invoiceId,
    businessId: params.businessId,
    isDeleted: false,
  });

  if (!invoice) return { error: "Invoice not found" } as const;

  const payment = await PaymentModel.create({
    businessId: params.businessId,
    invoiceId: invoice._id,
    amount: params.amount,
    method: params.method,
    reference: params.reference ?? null,
    paidAt: params.paidAt ?? new Date(),
    createdBy: params.createdBy ?? null,
    notes: params.notes ?? null,
    gatewayResponse: params.gatewayResponse ?? null,
  });

  invoice.totalPaid = (invoice.totalPaid ?? 0) + params.amount;
  invoice.payableAmount = Math.max(0, invoice.grandTotal - invoice.totalPaid);

  if (invoice.totalPaid >= invoice.grandTotal) {
    invoice.status = "paid";
  } else if (invoice.totalPaid > 0) {
    invoice.status = "partially_paid";
  }

  // If due date passed and still outstanding, mark overdue
  if (invoice.dueAt && invoice.dueAt.getTime() < Date.now() && invoice.payableAmount > 0) {
    invoice.status = "overdue";
  }

  await invoice.save();

  return { payment, invoice } as const;
}
