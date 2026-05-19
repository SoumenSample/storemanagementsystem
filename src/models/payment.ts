import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const PaymentSchema = new Schema(
  {
    businessId: { type: String, required: true, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ["cash", "card", "upi", "bank_transfer", "cheque", "other"],
      required: true,
    },
    reference: { type: String, default: null },
    paidAt: { type: Date, default: () => new Date() },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    notes: { type: String, default: null },
    gatewayResponse: { type: Schema.Types.Mixed, default: null },
    currency: { type: String, default: "INR" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type PaymentDocument = InferSchemaType<typeof PaymentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PaymentModel =
  (mongoose.models.Payment as Model<PaymentDocument>) ||
  mongoose.model<PaymentDocument>("Payment", PaymentSchema);
