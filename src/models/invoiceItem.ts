import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const InvoiceItemSchema = new Schema(
  {
    businessId: { type: String, required: true, index: true },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
      index: true,
    },
    productId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    description: { type: String, required: true },
    hsn: { type: String, required: true },
    unit: { type: String, default: null },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    lineDiscount: { type: Number, default: 0 },
    gstRate: { type: Number, required: true },
    taxableAmount: { type: Number, required: true },
    cgst: { type: Number, required: true },
    sgst: { type: Number, required: true },
    igst: { type: Number, required: true },
    total: { type: Number, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type InvoiceItemDocument = InferSchemaType<typeof InvoiceItemSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const InvoiceItemModel =
  (mongoose.models.InvoiceItem as Model<InvoiceItemDocument>) ||
  mongoose.model<InvoiceItemDocument>("InvoiceItem", InvoiceItemSchema);
