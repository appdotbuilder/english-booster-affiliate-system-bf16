import { z } from 'zod';

// Enums for program types and commission types
export const programTypeEnum = z.enum(['online', 'offline_pare', 'rombongan', 'cabang']);
export type ProgramType = z.infer<typeof programTypeEnum>;

export const commissionTypeEnum = z.enum(['percentage', 'flat']);
export type CommissionType = z.infer<typeof commissionTypeEnum>;

export const userRoleEnum = z.enum(['affiliate', 'admin']);
export type UserRole = z.infer<typeof userRoleEnum>;

export const payoutStatusEnum = z.enum(['pending', 'paid']);
export type PayoutStatus = z.infer<typeof payoutStatusEnum>;

export const registrationStatusEnum = z.enum(['pending', 'payment_verified']);
export type RegistrationStatus = z.infer<typeof registrationStatusEnum>;

// User schema (both affiliates and admin)
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  role: userRoleEnum,
  affiliate_code: z.string().nullable(), // Only for affiliates
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Program schema
export const programSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: programTypeEnum,
  fee: z.number(), // Program fee in rupiah
  commission_rate: z.number(), // Percentage or flat amount
  commission_type: commissionTypeEnum,
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Program = z.infer<typeof programSchema>;

// Registration schema (when someone signs up through affiliate link)
export const registrationSchema = z.object({
  id: z.number(),
  affiliate_id: z.number(),
  program_id: z.number(),
  student_name: z.string(),
  student_email: z.string().email(),
  student_phone: z.string(),
  status: registrationStatusEnum,
  commission_amount: z.number(), // Calculated commission
  registration_date: z.coerce.date(),
  payment_verified_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Registration = z.infer<typeof registrationSchema>;

// Link click tracking schema
export const linkClickSchema = z.object({
  id: z.number(),
  affiliate_id: z.number(),
  ip_address: z.string(),
  user_agent: z.string().nullable(),
  clicked_at: z.coerce.date()
});

export type LinkClick = z.infer<typeof linkClickSchema>;

// Payout request schema
export const payoutRequestSchema = z.object({
  id: z.number(),
  affiliate_id: z.number(),
  amount: z.number(),
  bank_name: z.string(),
  account_number: z.string(),
  account_holder_name: z.string(),
  status: payoutStatusEnum,
  requested_at: z.coerce.date(),
  processed_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type PayoutRequest = z.infer<typeof payoutRequestSchema>;

// Input schemas for creating/updating data

// User registration input
export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  role: userRoleEnum
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// User login input
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Program creation/update input
export const createProgramInputSchema = z.object({
  name: z.string().min(1),
  type: programTypeEnum,
  fee: z.number().positive(),
  commission_rate: z.number().positive(),
  commission_type: commissionTypeEnum,
  description: z.string().nullable().optional(),
  is_active: z.boolean().default(true)
});

export type CreateProgramInput = z.infer<typeof createProgramInputSchema>;

export const updateProgramInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  type: programTypeEnum.optional(),
  fee: z.number().positive().optional(),
  commission_rate: z.number().positive().optional(),
  commission_type: commissionTypeEnum.optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateProgramInput = z.infer<typeof updateProgramInputSchema>;

// Registration creation input
export const createRegistrationInputSchema = z.object({
  affiliate_code: z.string(),
  program_id: z.number(),
  student_name: z.string().min(1),
  student_email: z.string().email(),
  student_phone: z.string().min(1)
});

export type CreateRegistrationInput = z.infer<typeof createRegistrationInputSchema>;

// Link click tracking input
export const trackLinkClickInputSchema = z.object({
  affiliate_code: z.string(),
  ip_address: z.string(),
  user_agent: z.string().nullable().optional()
});

export type TrackLinkClickInput = z.infer<typeof trackLinkClickInputSchema>;

// Payout request input
export const createPayoutRequestInputSchema = z.object({
  amount: z.number().positive(),
  bank_name: z.string().min(1),
  account_number: z.string().min(1),
  account_holder_name: z.string().min(1)
});

export type CreatePayoutRequestInput = z.infer<typeof createPayoutRequestInputSchema>;

// Update payout status input
export const updatePayoutStatusInputSchema = z.object({
  id: z.number(),
  status: payoutStatusEnum
});

export type UpdatePayoutStatusInput = z.infer<typeof updatePayoutStatusInputSchema>;

// Verify payment input
export const verifyPaymentInputSchema = z.object({
  registration_id: z.number()
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentInputSchema>;

// Affiliate statistics response
export const affiliateStatsSchema = z.object({
  total_clicks: z.number(),
  total_registrations: z.number(),
  total_commission: z.number(),
  pending_commission: z.number(),
  verified_commission: z.number()
});

export type AffiliateStats = z.infer<typeof affiliateStatsSchema>;