import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const PasswordResetTokenSchema = new Schema(
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

export type PasswordResetTokenDocument = InferSchemaType<
  typeof PasswordResetTokenSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const PasswordResetTokenModel =
  (mongoose.models.PasswordResetToken as Model<PasswordResetTokenDocument>) ||
  mongoose.model<PasswordResetTokenDocument>(
    "PasswordResetToken",
    PasswordResetTokenSchema
  );
