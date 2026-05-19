import { InvoiceSequenceModel } from "@/models/invoiceSequence";
import { getFinancialYear } from "@/utils/finance";

export async function generateInvoiceNumber(params: {
  businessId: string;
  issuedAt: Date;
  prefix: string;
}) {
  const financialYear = getFinancialYear(params.issuedAt);
  const prefix = params.prefix.toUpperCase();

  const sequence = await InvoiceSequenceModel.findOneAndUpdate(
    { businessId: params.businessId, financialYear, prefix },
    { $inc: { lastNumber: 1 } },
    { new: true, upsert: true }
  );

  const number = String(sequence.lastNumber).padStart(4, "0");
  return `${prefix}-${financialYear}-${number}`;
}

export async function previewInvoiceNumber(params: {
  businessId: string;
  issuedAt: Date;
  prefix: string;
}) {
  const financialYear = getFinancialYear(params.issuedAt);
  const prefix = params.prefix.toUpperCase();

  const sequence = await InvoiceSequenceModel.findOne({
    businessId: params.businessId,
    financialYear,
    prefix,
  }).lean();

  const nextNumber = String((sequence?.lastNumber ?? 0) + 1).padStart(4, "0");
  return `${prefix}-${financialYear}-${nextNumber}`;
}
