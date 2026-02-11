import { z } from 'zod'

/**
 * Shared validation schemas using Zod
 */

// Password validation regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

// Auth schemas
export const signupSchema = z.object({
  email: z.string().email('Invalid email address').transform(v => v.toLowerCase()),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordRegex, 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number'),
  role: z.enum(['employer', 'candidate']).optional().default('candidate'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(), // Required for employers
  industry: z.string().optional() // Required for employers
})

// Email check schema
export const checkEmailSchema = z.object({
  email: z.string().email('Invalid email address').transform(v => v.toLowerCase())
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  expectedRole: z.enum(['employer', 'candidate']).optional()
})

// Password reset schemas
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').transform(v => v.toLowerCase())
})

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address').transform(v => v.toLowerCase())
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordRegex, 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number')
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordRegex, 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number')
})

// Profile schemas
export const completeEmployerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  industry: z.string().min(1, 'Industry is required'),
  industryOther: z.string().optional()
})

export const completeCandidateSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  resumeUrl: z.string().url().optional().nullable(),
  resumeFilename: z.string().optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable()
})

export const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable()
})

// Member schemas
export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  memberRole: z.enum(['admin', 'manager', 'employee', 'contractor']).optional().default('employee'),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'freelance']).optional().default('full_time'),
  salaryAmount: z.number().positive().optional(),
  salaryCurrency: z.string().optional().default('NPR')
})

export const updateMemberSchema = z.object({
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  memberRole: z.enum(['admin', 'manager', 'employee', 'contractor']).optional(),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'freelance']).optional(),
  salaryAmount: z.number().positive().optional(),
  salaryCurrency: z.string().optional()
})

// Common schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
})

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format')
})
