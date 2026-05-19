import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const StockMovementSchema = new Schema(
  {
    businessId: { type: String, required: true, index: true },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "OPENING",
        "SALE",
        "PURCHASE",
        "ADJUSTMENT",
        "TRANSFER",
        "MAP",
        "EXPIRY",
      ],
      required: true,
    },
    quantity: { type: Number, required: true },
    shelfId: { type: Schema.Types.ObjectId, ref: "ShelfLocation", default: null },
    fromShelfId: { type: Schema.Types.ObjectId, ref: "ShelfLocation", default: null },
    toShelfId: { type: Schema.Types.ObjectId, ref: "ShelfLocation", default: null },
    expiryDate: { type: Date, default: null },
    batchNo: { type: String, default: null },
    referenceId: { type: Schema.Types.ObjectId, default: null },
    notes: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type StockMovementDocument = InferSchemaType<
  typeof StockMovementSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const StockMovementModel =
  (mongoose.models.StockMovement as Model<StockMovementDocument>) ||
  mongoose.model<StockMovementDocument>("StockMovement", StockMovementSchema);
