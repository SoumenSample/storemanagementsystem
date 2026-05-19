import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const InvoiceSequenceSchema = new Schema(
  {
    businessId: { type: String, required: true, index: true },
    financialYear: { type: String, required: true },
    prefix: { type: String, required: true },
    lastNumber: { type: Number, default: 0 },
  },
  { timestamps: true }
);

InvoiceSequenceSchema.index(
  { businessId: 1, financialYear: 1, prefix: 1 },
  { unique: true }
);

export type InvoiceSequenceDocument = InferSchemaType<
  typeof InvoiceSequenceSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const InvoiceSequenceModel =
  (mongoose.models.InvoiceSequence as Model<InvoiceSequenceDocument>) ||
  mongoose.model<InvoiceSequenceDocument>(
    "InvoiceSequence",
    InvoiceSequenceSchema
  );
