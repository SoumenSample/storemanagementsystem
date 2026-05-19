import { z } from "zod";

export const createEmployeeSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  phone: z.string().regex(/^[0-9]{10}$/),
  dateOfBirth: z.coerce.date(),
  gender: z.enum(["Male", "Female", "Other"]),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  zipCode: z.string().regex(/^[0-9]{6}$/),
  aadharNumber: z.string().regex(/^[0-9]{12}$/).optional().or(z.literal("")),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/).optional().or(z.literal("")),
  bankAccountNumber: z.string().optional().or(z.literal("")),
  bankName: z.string().optional().or(z.literal("")),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional().or(z.literal("")),
  designation: z.string().min(2),
  department: z.string().min(2),
  employeeId: z.string().min(2),
  dateOfJoining: z.coerce.date(),
  employmentType: z.enum(["Full-Time", "Part-Time", "Contract", "Intern"]),
  status: z.enum(["Active", "Inactive", "On Leave", "Terminated"]).default("Active"),
  baseSalary: z.number().positive(),
  allowances: z.object({
    dearness: z.number().nonnegative().optional().default(0),
    houseRent: z.number().nonnegative().optional().default(0),
    medical: z.number().nonnegative().optional().default(0),
    other: z.number().nonnegative().optional().default(0),
  }).optional(),
  deductions: z.object({
    providentFund: z.number().nonnegative().optional().default(0),
    tax: z.number().nonnegative().optional().default(0),
    insurance: z.number().nonnegative().optional().default(0),
    other: z.number().nonnegative().optional().default(0),
  }).optional(),
  emergencyContactName: z.string().optional().or(z.literal("")),
  emergencyContactPhone: z.string().regex(/^[0-9]{10}$/).optional().or(z.literal("")),
  emergencyContactRelation: z.string().optional().or(z.literal("")),
  reportingManagerId: z.string().optional().or(z.literal("")),
  profileImage: z.string().optional().or(z.literal("")),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const attendanceSchema = z.object({
  employeeId: z.string(),
  date: z.coerce.date(),
  status: z.enum(["Present", "Absent", "Half Day", "Sick Leave", "Casual Leave", "On Leave"]),
  checkInTime: z.string().optional().or(z.literal("")),
  checkOutTime: z.string().optional().or(z.literal("")),
  hoursWorked: z.number().nonnegative().optional(),
  notes: z.string().optional().or(z.literal("")),
});

export const shiftSchema = z.object({
  shiftName: z.string().min(2).max(50),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  duration: z.number().positive(),
  description: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  employees: z.array(z.string()).optional().default([]),
});

export const salarySchema = z.object({
  employeeId: z.string(),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
  baseSalary: z.number().positive(),
  allowances: z.object({
    dearness: z.number().nonnegative().optional().default(0),
    houseRent: z.number().nonnegative().optional().default(0),
    medical: z.number().nonnegative().optional().default(0),
    other: z.number().nonnegative().optional().default(0),
  }).optional(),
  deductions: z.object({
    providentFund: z.number().nonnegative().optional().default(0),
    tax: z.number().nonnegative().optional().default(0),
    insurance: z.number().nonnegative().optional().default(0),
    other: z.number().nonnegative().optional().default(0),
  }).optional(),
  workingDays: z.number().nonnegative().optional(),
  presentDays: z.number().nonnegative().optional(),
  leaveDays: z.number().nonnegative().optional(),
  status: z.enum(["Draft", "Approved", "Processed", "Paid"]).optional(),
  notes: z.string().optional().or(z.literal("")),
});

export const performanceSchema = z.object({
  employeeId: z.string(),
  reviewPeriodStart: z.coerce.date(),
  reviewPeriodEnd: z.coerce.date(),
  reviewedBy: z.string(),
  overallRating: z.number().min(1).max(5),
  categories: z.array(z.object({
    category: z.string(),
    rating: z.number().min(1).max(5),
    comments: z.string().optional(),
  })).optional(),
  strengths: z.string().optional().or(z.literal("")),
  areasForImprovement: z.string().optional().or(z.literal("")),
  goals: z.string().optional().or(z.literal("")),
  salary_adjustment: z.number().optional(),
  promotionEligible: z.boolean().optional(),
  reviewNotes: z.string().optional().or(z.literal("")),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type AttendanceInput = z.infer<typeof attendanceSchema>;
export type ShiftInput = z.infer<typeof shiftSchema>;
export type SalaryInput = z.infer<typeof salarySchema>;
export type PerformanceInput = z.infer<typeof performanceSchema>;
