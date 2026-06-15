import { z } from 'zod'


const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(1, 'Email is required')
  .max(255, 'Email is too long')
  .toLowerCase()


const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*]/, 'Password must contain at least one special character (!@#$%^&*)')


const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(255, 'Name is too long')
  .optional()


export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  name: nameSchema,
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export type RegisterInput = z.infer<typeof registerSchema>


export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export type LoginInput = z.infer<typeof loginSchema>


export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>


export const passwordResetSchema = z.object({
  email: emailSchema,
})

export type PasswordResetInput = z.infer<typeof passwordResetSchema>


export const setPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export type SetPasswordInput = z.infer<typeof setPasswordSchema>
