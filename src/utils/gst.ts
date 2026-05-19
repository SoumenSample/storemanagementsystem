export type GstRate = 0 | 5 | 12 | 18 | 28;

export type GstLineInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  lineDiscount?: number;
  gstRate: GstRate;
};

export type GstLineResult = GstLineInput & {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
};

export type GstInvoiceTotals = {
  subtotal: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalTax: number;
  total: number;
  discount: number;
  roundOff: number;
  payableAmount: number;
};

export type GstInvoiceResult = {
  transactionType: "intra" | "inter";
  items: GstLineResult[];
  totals: GstInvoiceTotals;
};

export function resolveProductGstRate(
  productGstRate?: number | null,
  categoryGstRate?: number | null
): GstRate | null {
  if (productGstRate === null || productGstRate === undefined) {
    return (categoryGstRate as GstRate) ?? null;
  }

  if (
    productGstRate === 0 &&
    categoryGstRate !== null &&
    categoryGstRate !== undefined &&
    categoryGstRate !== 0
  ) {
    return categoryGstRate as GstRate;
  }

  return productGstRate as GstRate;
}

export function calculateGST(
  items: GstLineInput[],
  supplierState: string,
  buyerState: string,
  invoiceDiscount = 0
): GstInvoiceResult {
  const transactionType =
    supplierState.trim().toLowerCase() === buyerState.trim().toLowerCase()
      ? "intra"
      : "inter";

  const computedItems = items.map((item) => {
    const lineDiscount = item.lineDiscount ?? 0;
    const taxableAmount = Math.max(0, item.quantity * item.unitPrice - lineDiscount);
    const gstRate = item.gstRate;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (gstRate > 0) {
      if (transactionType === "intra") {
        const halfRate = gstRate / 2;
        cgst = (taxableAmount * halfRate) / 100;
        sgst = (taxableAmount * halfRate) / 100;
      } else {
        igst = (taxableAmount * gstRate) / 100;
      }
    }

    const total = taxableAmount + cgst + sgst + igst;

    return {
      ...item,
      lineDiscount,
      taxableAmount,
      cgst,
      sgst,
      igst,
      total,
    };
  });

  const subtotal = computedItems.reduce(
    (sum, item) => sum + item.taxableAmount,
    0
  );
  const totalCGST = computedItems.reduce((sum, item) => sum + item.cgst, 0);
  const totalSGST = computedItems.reduce((sum, item) => sum + item.sgst, 0);
  const totalIGST = computedItems.reduce((sum, item) => sum + item.igst, 0);
  const totalTax = totalCGST + totalSGST + totalIGST;
  const total = subtotal + totalTax - invoiceDiscount;
  const roundOff = Math.round(total) - total;
  const payableAmount = total + roundOff;

  return {
    transactionType,
    items: computedItems,
    totals: {
      subtotal,
      totalCGST,
      totalSGST,
      totalIGST,
      totalTax,
      total,
      discount: invoiceDiscount,
      roundOff,
      payableAmount,
    },
  };
}
