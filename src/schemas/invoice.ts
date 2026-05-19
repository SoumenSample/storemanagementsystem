import { z } from "zod";

export const invoiceItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1),
  hsn: z.string().min(4),
  unit: z.string().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  lineDiscount: z.number().nonnegative().optional(),
  gstRate: z.union([
    z.literal(0),
    z.literal(5),
    z.literal(12),
    z.literal(18),
    z.literal(28),
  ]),
});

export const createInvoiceSchema = z.object({
  documentType: z.enum([
    "TAX_INVOICE",
    "PROFORMA",
    "QUOTATION",
    "DELIVERY_CHALLAN",
  ]),
  buyerName: z.string().min(2),
  buyerGstin: z.string().optional(),
  buyerPhone: z.string().optional(),
  buyerEmail: z.string().email().optional(),
  buyerAddress: z.string().min(5),
  supplierState: z.string().min(2),
  buyerState: z.string().min(2),
  items: z.array(invoiceItemSchema).min(1),
  invoiceDiscount: z.number().nonnegative().optional(),
  invoicePrefix: z.string().min(1).max(12),
});
