import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const AttendanceSchema = new Schema(
  {
    businessId: { type: String, required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    date: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["Present", "Absent", "Half Day", "Sick Leave", "Casual Leave", "On Leave"],
      required: true,
    },
    checkInTime: { type: String, default: null },
    checkOutTime: { type: String, default: null },
    hoursWorked: { type: Number, default: 0 },
    notes: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AttendanceSchema.index({ businessId: 1, employeeId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ businessId: 1, date: 1 });

export type AttendanceDocument = InferSchemaType<typeof AttendanceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AttendanceModel =
  (mongoose.models.Attendance as Model<AttendanceDocument>) ||
  mongoose.model<AttendanceDocument>("Attendance", AttendanceSchema);
