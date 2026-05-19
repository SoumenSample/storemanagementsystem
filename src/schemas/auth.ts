import { z } from "zod";
import { isStrongPassword } from "@/utils/password";

export const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z
    .string()
    .min(8)
    .refine(isStrongPassword, "Password is too weak"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  remember: z.boolean().optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(32),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32),
  password: z.string().min(8).refine(isStrongPassword, "Password is too weak"),
});
