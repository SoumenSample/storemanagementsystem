import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const InvoiceSchema = new Schema(
  {
    businessId: { type: String, required: true, index: true },
    invoiceNumber: { type: String, required: true, index: true },
    documentType: {
      type: String,
      enum: [
        "TAX_INVOICE",
        "PROFORMA",
        "QUOTATION",
        "DELIVERY_CHALLAN",
        "CREDIT_NOTE",
        "DEBIT_NOTE",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "draft",
        "sent",
        "paid",
        "partially_paid",
        "overdue",
        "cancelled",
      ],
      default: "draft",
    },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", default: null },
    buyerName: { type: String, required: true },
    buyerGstin: { type: String, default: null },
    buyerPhone: { type: String, default: null },
    buyerEmail: { type: String, default: null },
    buyerAddress: { type: String, required: true },
    supplierState: { type: String, required: true },
    buyerState: { type: String, required: true },
    transactionType: { type: String, enum: ["intra", "inter"], required: true },
    subtotal: { type: Number, required: true },
    totalCGST: { type: Number, required: true },
    totalSGST: { type: Number, required: true },
    totalIGST: { type: Number, required: true },
    totalTax: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    payableAmount: { type: Number, required: true },
    totalPaid: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    issuedAt: { type: Date, default: () => new Date() },
    dueAt: { type: Date, default: null },
    finalizedAt: { type: Date, default: null },
    notes: { type: String, default: null },
    terms: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

InvoiceSchema.index({ businessId: 1, invoiceNumber: 1 }, { unique: true });

export type InvoiceDocument = InferSchemaType<typeof InvoiceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const InvoiceModel =
  (mongoose.models.Invoice as Model<InvoiceDocument>) ||
  mongoose.model<InvoiceDocument>("Invoice", InvoiceSchema);
