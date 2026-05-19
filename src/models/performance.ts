import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const PerformanceSchema = new Schema(
  {
    businessId: { type: String, required: true, index: true },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    reviewPeriodStart: { type: Date, required: true },
    reviewPeriodEnd: { type: Date, required: true },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    overallRating: { type: Number, required: true, min: 1, max: 5 }, // 1-5 stars
    categories: [
      {
        category: { type: String, required: true }, // e.g., "Productivity", "Quality", "Teamwork"
        rating: { type: Number, required: true, min: 1, max: 5 },
        comments: { type: String, default: null },
      },
    ],
    strengths: { type: String, default: null },
    areasForImprovement: { type: String, default: null },
    goals: { type: String, default: null },
    salary_adjustment: { type: Number, default: 0 }, // percentage
    promotionEligible: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["Draft", "Submitted", "Reviewed", "Finalized"],
      default: "Draft",
    },
    reviewNotes: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PerformanceSchema.index({ businessId: 1, employeeId: 1 });
PerformanceSchema.index({ businessId: 1, reviewPeriodStart: 1, reviewPeriodEnd: 1 });

export type PerformanceDocument = InferSchemaType<typeof PerformanceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PerformanceModel =
  (mongoose.models.Performance as Model<PerformanceDocument>) ||
  mongoose.model<PerformanceDocument>("Performance", PerformanceSchema);
