import { z } from "zod";

const phoneRegex = /^\+?[0-9]{10,15}$/;

export const loginSchema = z.object({
  phone: z.string().trim().regex(phoneRegex, "Invalid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(phoneRegex, "Invalid phone number"),
  qualification: z.string().trim().min(2).max(150),
  password: z.string().min(8).max(100),
  role: z.enum(["admin", "user"]),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(8),
  newPassword: z.string().min(8).max(100),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(100),
});
