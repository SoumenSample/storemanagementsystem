import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ShelfInventorySchema = new Schema(
  {
    businessId: { type: String, required: true, index: true },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    shelfId: {
      type: Schema.Types.ObjectId,
      ref: "ShelfLocation",
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true, default: 0 },
    expiryDate: { type: Date, default: null },
    batchNo: { type: String, default: null },
    notes: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ShelfInventorySchema.index(
  { businessId: 1, productId: 1, shelfId: 1, expiryDate: 1, batchNo: 1 },
  { unique: true }
);

export type ShelfInventoryDocument = InferSchemaType<typeof ShelfInventorySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ShelfInventoryModel =
  (mongoose.models.ShelfInventory as Model<ShelfInventoryDocument>) ||
  mongoose.model<ShelfInventoryDocument>("ShelfInventory", ShelfInventorySchema);