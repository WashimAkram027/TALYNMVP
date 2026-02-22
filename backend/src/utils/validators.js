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
  salaryCurrency: z.string().optional().default('NPR'),
  location: z.string().optional(),
  startDate: z.string().optional(),
  payFrequency: z.string().optional(),
  jobDescription: z.string().max(1000).optional(),
  probationPeriod: z.number().int().optional()
})

export const updateMemberSchema = z.object({
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  memberRole: z.enum(['admin', 'manager', 'employee', 'contractor']).optional(),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'freelance']).optional(),
  salaryAmount: z.number().positive().optional(),
  salaryCurrency: z.string().optional()
})

// Payroll schemas
export const createPayrollRunSchema = z.object({
  payPeriodStart: z.string().min(1, 'Pay period start is required'),
  payPeriodEnd: z.string().min(1, 'Pay period end is required'),
  payDate: z.string().min(1, 'Pay date is required')
})

export const updatePayrollStatusSchema = z.object({
  status: z.enum(['draft', 'processing', 'completed', 'cancelled'])
})

export const updatePayrollItemSchema = z.object({
  baseSalary: z.number().optional(),
  bonus: z.number().optional(),
  deductions: z.number().optional(),
  taxAmount: z.number().optional(),
  netPay: z.number().optional(),
  notes: z.string().optional(),
  status: z.string().optional()
})

export const payrollFiltersSchema = z.object({
  status: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
})

// Time Off schemas
export const createTimeOffPolicySchema = z.object({
  name: z.string().min(1, 'Policy name is required'),
  description: z.string().optional(),
  daysPerYear: z.number().positive('Days per year must be positive'),
  isPaid: z.boolean().optional(),
  accrualRate: z.string().optional(),
  maxCarryover: z.number().optional()
})

export const updateTimeOffPolicySchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  daysPerYear: z.number().positive().optional(),
  isPaid: z.boolean().optional(),
  accrualRate: z.string().optional(),
  maxCarryover: z.number().optional()
})

export const createTimeOffRequestSchema = z.object({
  policyId: z.string().uuid('Invalid policy ID'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().optional(),
  memberId: z.string().uuid().optional()
})

export const reviewTimeOffRequestSchema = z.object({
  approved: z.boolean(),
  notes: z.string().optional()
})

export const timeOffRequestFiltersSchema = z.object({
  memberId: z.string().optional(),
  status: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
})

export const initializeBalancesSchema = z.object({
  year: z.number().int().optional()
})

// Benefits schemas
export const createBenefitsPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  type: z.string().min(1, 'Plan type is required'),
  description: z.string().optional(),
  provider: z.string().optional(),
  premiumAmount: z.number().optional(),
  coverageDetails: z.string().optional(),
  isActive: z.boolean().optional()
})

export const updateBenefitsPlanSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  description: z.string().optional(),
  provider: z.string().optional(),
  premiumAmount: z.number().optional(),
  coverageDetails: z.string().optional(),
  isActive: z.boolean().optional()
})

export const enrollMemberSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
  planId: z.string().uuid('Invalid plan ID'),
  coverageStartDate: z.string().min(1, 'Coverage start date is required')
})

export const updateEnrollmentSchema = z.object({
  status: z.string().optional(),
  coverageEndDate: z.string().optional(),
  notes: z.string().optional()
})

// Holiday schemas
export const createHolidaySchema = z.object({
  name: z.string().min(1, 'Holiday name is required'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
  isRecurring: z.boolean().optional()
})

export const updateHolidaySchema = z.object({
  name: z.string().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  isRecurring: z.boolean().optional()
})

export const copyGlobalHolidaysSchema = z.object({
  year: z.number().int().optional()
})

// Announcement schemas
export const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  isPinned: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  expiresAt: z.string().optional()
})

export const updateAnnouncementSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  isPinned: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  expiresAt: z.string().optional()
})

// Invoice schemas
export const createInvoiceSchema = z.object({
  invoiceNumber: z.string().optional(),
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email().optional(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().optional().default('NPR'),
  dueDate: z.string().min(1, 'Due date is required'),
  status: z.string().optional(),
  items: z.array(z.any()).optional(),
  notes: z.string().optional()
})

export const updateInvoiceSchema = z.object({
  invoiceNumber: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.string().optional(),
  items: z.array(z.any()).optional(),
  notes: z.string().optional()
})

// Document schemas
export const uploadDocumentMetaSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  category: z.enum(['contract', 'policy', 'tax', 'identity', 'payslip', 'other']).optional().default('other'),
  memberId: z.string().uuid().optional(),
  isSensitive: z.boolean().optional()
})

export const updateDocumentSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  category: z.enum(['contract', 'policy', 'tax', 'identity', 'payslip', 'other']).optional(),
  isSensitive: z.boolean().optional()
})

// Job Posting schemas
export const createJobPostingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  department: z.string().optional(),
  location: z.string().optional(),
  employmentType: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  salaryCurrency: z.string().optional(),
  requirements: z.string().optional(),
  isRemote: z.boolean().optional(),
  status: z.enum(['draft', 'open', 'closed']).optional()
})

export const updateJobPostingSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  employmentType: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  salaryCurrency: z.string().optional(),
  requirements: z.string().optional(),
  isRemote: z.boolean().optional(),
  status: z.enum(['draft', 'open', 'closed']).optional()
})

export const jobPostingFiltersSchema = z.object({
  status: z.string().optional(),
  department: z.string().optional()
})

// Application schemas
export const applyToJobSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  coverLetter: z.string().optional(),
  resumeUrl: z.string().optional()
})

export const moveStageSchema = z.object({
  stage: z.enum(['applied', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected']),
  notes: z.string().optional()
})

export const updateApplicationSchema = z.object({
  notes: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional()
})

// Compliance schemas
export const createComplianceItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  itemType: z.string().min(1, 'Item type is required'),
  memberId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
  isRequired: z.boolean().optional(),
  status: z.enum(['pending', 'submitted', 'approved', 'rejected']).optional()
})

export const updateComplianceItemSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  itemType: z.string().optional(),
  memberId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
  isRequired: z.boolean().optional(),
  status: z.enum(['pending', 'submitted', 'approved', 'rejected']).optional()
})

export const createComplianceAlertSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  severity: z.enum(['info', 'warning', 'error']).optional(),
  alertType: z.string().optional(),
  complianceItemId: z.string().uuid().optional(),
  memberId: z.string().uuid().optional()
})

export const complianceFiltersSchema = z.object({
  status: z.string().optional(),
  itemType: z.string().optional(),
  memberId: z.string().optional(),
  isRequired: z.coerce.boolean().optional()
})

// Common schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
})

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format')
})
