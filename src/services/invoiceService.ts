import { InvoiceModel } from "@/models/invoice";
import { InvoiceItemModel } from "@/models/invoiceItem";
import { ProductModel } from "@/models/product";
import { generateInvoiceNumber } from "@/services/invoiceNumber";
import { consumeShelfInventory } from "@/services/shelfService";
import { calculateGST, type GstLineInput } from "@/utils/gst";

export type CreateInvoiceInput = {
  businessId: string;
  documentType: "TAX_INVOICE" | "PROFORMA" | "QUOTATION" | "DELIVERY_CHALLAN";
  buyerName: string;
  buyerGstin?: string | null;
  buyerPhone?: string | null;
  buyerEmail?: string | null;
  buyerAddress: string;
  supplierState: string;
  buyerState: string;
  items: Array<
    GstLineInput & { hsn: string; unit?: string | null; productId?: string | null }
  >;
  invoiceDiscount?: number;
  invoicePrefix: string;
  issuedAt?: Date;
  dueAt?: Date | null;
  notes?: string | null;
  terms?: string | null;
};

export async function createInvoice(input: CreateInvoiceInput) {
  const issuedAt = input.issuedAt ?? new Date();
  const gst = calculateGST(
    input.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineDiscount: item.lineDiscount,
      gstRate: item.gstRate,
    })),
    input.supplierState,
    input.buyerState,
    input.invoiceDiscount ?? 0
  );

  const invoiceNumber = await generateInvoiceNumber({
    businessId: input.businessId,
    issuedAt,
    prefix: input.invoicePrefix,
  });

  // Safeguard: ensure payableAmount is correctly calculated
  const payableAmount = gst.totals.payableAmount || (gst.totals.total + gst.totals.roundOff);

  const invoice = await InvoiceModel.create({
    businessId: input.businessId,
    invoiceNumber,
    documentType: input.documentType,
    status: "draft",
    buyerName: input.buyerName,
    buyerGstin: input.buyerGstin ?? null,
    buyerPhone: input.buyerPhone ?? null,
    buyerEmail: input.buyerEmail ?? null,
    buyerAddress: input.buyerAddress,
    supplierState: input.supplierState,
    buyerState: input.buyerState,
    transactionType: gst.transactionType,
    subtotal: gst.totals.subtotal,
    totalCGST: gst.totals.totalCGST,
    totalSGST: gst.totals.totalSGST,
    totalIGST: gst.totals.totalIGST,
    totalTax: gst.totals.totalTax,
    discount: gst.totals.discount,
    roundOff: gst.totals.roundOff,
    grandTotal: gst.totals.total,
    payableAmount: payableAmount,
    issuedAt,
    dueAt: input.dueAt ?? null,
    notes: input.notes ?? null,
    terms: input.terms ?? null,
  });

  await InvoiceItemModel.insertMany(
    gst.items.map((item, index) => ({
      businessId: input.businessId,
      invoiceId: invoice._id,
      productId: input.items[index]?.productId ?? null,
      description: item.description,
      hsn: input.items[index]?.hsn ?? "",
      unit: input.items[index]?.unit ?? null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineDiscount: item.lineDiscount ?? 0,
      gstRate: item.gstRate,
      taxableAmount: item.taxableAmount,
      cgst: item.cgst,
      sgst: item.sgst,
      igst: item.igst,
      total: item.total,
    }))
  );

  return invoice;
}

export async function finalizeInvoice(params: {
  businessId: string;
  invoiceId: string;
  status: "sent" | "paid";
}) {
  const invoice = await InvoiceModel.findOne({
    _id: params.invoiceId,
    businessId: params.businessId,
    isDeleted: false,
  });

  if (!invoice) return { error: "Not found" } as const;
  if (invoice.finalizedAt) return { invoice } as const;

  const items = await InvoiceItemModel.find({
    invoiceId: invoice._id,
    businessId: params.businessId,
    isDeleted: false,
  });

  const productIds = items
    .map((item) => item.productId?.toString())
    .filter(Boolean) as string[];

  if (productIds.length) {
    const products = await ProductModel.find({
      _id: { $in: productIds },
      businessId: params.businessId,
      isDeleted: false,
    });

    const productMap = new Map(
      products.map((product) => [product._id.toString(), product])
    );
    const quantityByProductId = new Map<string, number>();

    for (const item of items) {
      if (!item.productId) continue;
      const product = productMap.get(item.productId.toString());
      if (!product) {
        return { error: "Product missing" } as const;
      }
      quantityByProductId.set(
        product._id.toString(),
        (quantityByProductId.get(product._id.toString()) ?? 0) + item.quantity
      );
    }

    for (const [productId, quantity] of quantityByProductId.entries()) {
      await consumeShelfInventory({
        businessId: params.businessId,
        productId,
        quantity,
        referenceId: invoice._id.toString(),
        notes: `Invoice ${invoice.invoiceNumber}`,
        movementType: "SALE",
      });
    }
  }

  invoice.status = params.status;
  invoice.finalizedAt = new Date();
  await invoice.save();

  return { invoice } as const;
}
