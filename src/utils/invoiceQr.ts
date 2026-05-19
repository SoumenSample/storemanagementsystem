type InvoiceForQr = {
  _id?: { toString(): string } | string;
  invoiceNumber?: string;
  issuedAt?: string | Date;
  buyerName?: string;
  payableAmount?: number;
  grandTotal?: number;
  roundOff?: number;
};

type BusinessForQr = {
  name?: string;
  gstin?: string;
};

export function buildInvoiceQrPayload(invoice: InvoiceForQr, business?: BusinessForQr | null): string {
  const payableAmount =
    typeof invoice.payableAmount === "number" && invoice.payableAmount > 0
      ? invoice.payableAmount
      : (invoice.grandTotal ?? 0) + (invoice.roundOff ?? 0);

  return JSON.stringify({
    type: "invoice",
    id: typeof invoice._id === "string" ? invoice._id : invoice._id?.toString(),
    invoiceNumber: invoice.invoiceNumber ?? "",
    issuedAt: invoice.issuedAt ?? null,
    buyerName: invoice.buyerName ?? "",
    businessName: business?.name ?? "",
    businessGstin: business?.gstin ?? "",
    amount: Number(payableAmount.toFixed(2)),
  });
}
