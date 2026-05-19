import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const BankDetailsSchema = new Schema(
  {
    bankName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    ifsc: { type: String, required: true, trim: true },
    branch: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const BusinessSchema = new Schema(
  {
    businessId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    ownerName: { type: String, default: null, trim: true },
    gstin: { type: String, required: true, uppercase: true, trim: true },
    pan: { type: String, required: true, uppercase: true, trim: true },
    address: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    stateCode: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    website: { type: String, default: null },
    invoicePrefix: { type: String, default: "INV", trim: true },
    financialYearStartMonth: { type: Number, default: 4 },
    gstRegistrationType: {
      type: String,
      enum: ["REGULAR", "UNREGISTERED"],
      default: "REGULAR",
    },
    bankDetails: { type: BankDetailsSchema, required: true },
    logoUrl: { type: String, default: null },
    signatureUrl: { type: String, default: null },
    upiQrUrl: { type: String, default: null },
    subscriptionPlan: {
      type: String,
      enum: ["free", "starter", "pro", "enterprise"],
      default: "free",
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "trial", "expired"],
      default: "trial",
    },
    enabledFeatures: { type: [String], default: [] },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type BusinessDocument = InferSchemaType<typeof BusinessSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const BusinessModel =
  (mongoose.models.Business as Model<BusinessDocument>) ||
  mongoose.model<BusinessDocument>("Business", BusinessSchema);
