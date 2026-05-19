import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ShiftSchema = new Schema(
  {
    businessId: { type: String, required: true, index: true },
    shiftName: { type: String, required: true, trim: true },
    startTime: { type: String, required: true }, // Format: "HH:MM"
    endTime: { type: String, required: true }, // Format: "HH:MM"
    duration: { type: Number, required: true }, // in hours
    description: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    employees: [{ type: Schema.Types.ObjectId, ref: "Employee" }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ShiftSchema.index({ businessId: 1, shiftName: 1 }, { unique: true });

export type ShiftDocument = InferSchemaType<typeof ShiftSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ShiftModel =
  (mongoose.models.Shift as Model<ShiftDocument>) ||
  mongoose.model<ShiftDocument>("Shift", ShiftSchema);
