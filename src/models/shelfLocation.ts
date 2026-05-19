import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ShelfLocationSchema = new Schema(
  {
    businessId: { type: String, required: true, index: true },
    code: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    locationType: {
      type: String,
      enum: ["AISLE", "RACK", "SHELF", "BIN"],
      required: true,
    },
    parentShelfId: {
      type: Schema.Types.ObjectId,
      ref: "ShelfLocation",
      default: null,
    },
    capacityQty: { type: Number, default: 0 },
    minOccupancyPct: { type: Number, default: 85 },
    barcode: { type: String, default: null },
    qrValue: { type: String, default: null },
    notes: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ShelfLocationSchema.index({ businessId: 1, code: 1 }, { unique: true });
ShelfLocationSchema.index({ businessId: 1, parentShelfId: 1 });

export type ShelfLocationDocument = InferSchemaType<typeof ShelfLocationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ShelfLocationModel =
  (mongoose.models.ShelfLocation as Model<ShelfLocationDocument>) ||
  mongoose.model<ShelfLocationDocument>("ShelfLocation", ShelfLocationSchema);