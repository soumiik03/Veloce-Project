import { z } from "zod"

export const registerSchema = z.object({
  email: z.string().email().min(5).max(254).toLowerCase().trim(),
  password: z.string().min(12).max(128),
  name: z.string().min(2).max(100).trim(),
})