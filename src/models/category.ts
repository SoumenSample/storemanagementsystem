import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const CategorySchema = new Schema(
  {
    businessId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    gstRate: { type: Number, default: 18 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CategorySchema.index(
  { businessId: 1, name: 1 },
  { unique: true, sparse: true, partialFilterExpression: { isDeleted: false } }
);

export type CategoryDocument = InferSchemaType<typeof CategorySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CategoryModel =
  (mongoose.models.Category as Model<CategoryDocument>) ||
  mongoose.model<CategoryDocument>("Category", CategorySchema);
