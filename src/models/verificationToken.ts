import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const VerificationTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type VerificationTokenDocument = InferSchemaType<
  typeof VerificationTokenSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const VerificationTokenModel =
  (mongoose.models.VerificationToken as Model<VerificationTokenDocument>) ||
  mongoose.model<VerificationTokenDocument>(
    "VerificationToken",
    VerificationTokenSchema
  );
