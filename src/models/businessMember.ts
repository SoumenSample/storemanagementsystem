import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const BusinessMemberSchema = new Schema(
  {
    businessId: { type: String, required: true, index: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["OWNER", "ADMIN", "CASHIER", "INVENTORY_MANAGER"],
      required: true,
    },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

BusinessMemberSchema.index({ businessId: 1, userId: 1 }, { unique: true });

export type BusinessMemberDocument = InferSchemaType<
  typeof BusinessMemberSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const BusinessMemberModel =
  (mongoose.models.BusinessMember as Model<BusinessMemberDocument>) ||
  mongoose.model<BusinessMemberDocument>(
    "BusinessMember",
    BusinessMemberSchema
  );
