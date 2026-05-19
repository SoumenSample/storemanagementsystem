import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SalarySchema = new Schema(
  {
    businessId: { type: String, required: true, index: true },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },
    baseSalary: { type: Number, required: true },
    allowances: {
      dearness: { type: Number, default: 0 },
      houseRent: { type: Number, default: 0 },
      medical: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    deductions: {
      providentFund: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      insurance: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    totalAllowances: { type: Number, required: true },
    totalDeductions: { type: Number, required: true },
    netSalary: { type: Number, required: true },
    workingDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Draft", "Approved", "Processed", "Paid"],
      default: "Draft",
    },
    paidDate: { type: Date, default: null },
    notes: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

SalarySchema.index({ businessId: 1, employeeId: 1, month: 1, year: 1 }, { unique: true });

export type SalaryDocument = InferSchemaType<typeof SalarySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SalaryModel =
  (mongoose.models.Salary as Model<SalaryDocument>) ||
  mongoose.model<SalaryDocument>("Salary", SalarySchema);
