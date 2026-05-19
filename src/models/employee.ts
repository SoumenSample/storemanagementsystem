import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const EmployeeSchema = new Schema(
  {
    businessId: { type: String, required: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    aadharNumber: { type: String, trim: true, default: null },
    panNumber: { type: String, trim: true, default: null },
    bankAccountNumber: { type: String, trim: true, default: null },
    bankName: { type: String, default: null },
    ifscCode: { type: String, default: null },
    designation: { type: String, required: true },
    department: { type: String, required: true },
    employeeId: { type: String, required: true, index: true },
    dateOfJoining: { type: Date, required: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    businessRole: {
      type: String,
      enum: ["CASHIER", "INVENTORY_MANAGER"],
      default: null,
    },
    employmentType: {
      type: String,
      enum: ["Full-Time", "Part-Time", "Contract", "Intern"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "On Leave", "Terminated"],
      default: "Active",
    },
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
    emergencyContactName: { type: String, default: null },
    emergencyContactPhone: { type: String, default: null },
    emergencyContactRelation: { type: String, default: null },
    reportingManagerId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    profileImage: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

EmployeeSchema.index({ businessId: 1, employeeId: 1 }, { unique: true });
EmployeeSchema.index({ businessId: 1, email: 1 }, { unique: true });
EmployeeSchema.index({ businessId: 1, status: 1 });

export type EmployeeDocument = InferSchemaType<typeof EmployeeSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const EmployeeModel =
  (mongoose.models.Employee as Model<EmployeeDocument>) ||
  mongoose.model<EmployeeDocument>("Employee", EmployeeSchema);
