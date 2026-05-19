import { z } from "zod";

export const businessOnboardingSchema = z.object({
  name: z.string().min(2),
  ownerName: z.string().min(2).optional().or(z.literal("")),
  gstin: z.string().min(8),
  pan: z.string().min(8),
  address: z.string().min(5),
  state: z.string().min(2),
  stateCode: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email(),
  website: z.string().url().optional().or(z.literal("")),
  invoicePrefix: z.string().min(1).max(12),
  gstRegistrationType: z.enum(["REGULAR", "UNREGISTERED"]),
  bankDetails: z.object({
    bankName: z.string().min(2),
    accountNumber: z.string().min(6),
    ifsc: z.string().min(5),
    branch: z.string().min(2),
  }),
  logoUrl: z.string().url().optional().or(z.literal("")),
  signatureUrl: z.string().url().optional().or(z.literal("")),
  upiQrUrl: z.string().url().optional().or(z.literal("")),
});

export const businessSettingsSchema = businessOnboardingSchema.extend({
  financialYearStartMonth: z.number().int().min(1).max(12),
});
