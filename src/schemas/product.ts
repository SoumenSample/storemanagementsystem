import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  barcode: z.string().optional().or(z.literal("")),
  hsn: z.string().min(4),
  categoryId: z.string().optional().or(z.literal("")),
  unit: z.string().min(1),
  gstRate: z.union([
    z.literal(0),
    z.literal(5),
    z.literal(12),
    z.literal(18),
    z.literal(28),
  ]).optional().or(z.literal(null)),
  purchasePrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  mrp: z.number().nonnegative(),
  stockQty: z.number().nonnegative().optional(),
  minStock: z.number().nonnegative().optional(),
  openingStock: z.number().nonnegative().optional(),
});
