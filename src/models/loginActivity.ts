import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const LoginActivitySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    businessId: { type: String, index: true, default: null },
    email: { type: String, trim: true, lowercase: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    success: { type: Boolean, default: false },
    reason: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type LoginActivityDocument = InferSchemaType<
  typeof LoginActivitySchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const LoginActivityModel =
  (mongoose.models.LoginActivity as Model<LoginActivityDocument>) ||
  mongoose.model<LoginActivityDocument>("LoginActivity", LoginActivitySchema);
