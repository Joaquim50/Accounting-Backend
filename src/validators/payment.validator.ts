import { z } from 'zod';
import { PaymentFrequency, PartyType, DeductionType, PaymentStatus } from '@prisma/client';

// 1. Base Zod object schema (without refinements)
const basePaymentObject = z.object({
  paymentFrequency: z.nativeEnum(PaymentFrequency),
  expenseDate: z.string().transform((val) => new Date(val)),
  expenseType: z.string().min(1, 'Expense type is required'),
  partyType: z.nativeEnum(PartyType),
  
  // Custom or related parties
  vendorId: z.string().uuid('Invalid vendor ID').optional().nullable(),
  employeeId: z.string().uuid('Invalid employee ID').optional().nullable(),
  partyNameCustom: z.string().min(1, 'Party name is required').optional().nullable(),

  notes: z.string().optional().nullable(),

  // Financial details
  baseAmount: z.number().min(0, 'Base amount cannot be negative'),
  gstApplicable: z.boolean(),
  gstPercentage: z.number().min(0).max(100).optional().nullable(),
  gstAmount: z.number().min(0).optional().nullable(),

  // Deduction details
  deductionType: z.nativeEnum(DeductionType),
  deductionPercentageTDS: z.number().min(0).max(100).optional().nullable(),
  ptAmountFixed: z.number().min(0).optional().nullable(),
  deductionPercentageOther: z.number().min(0).max(100).optional().nullable(),
  deductionAmount: z.number().min(0).optional().nullable(),

  netPayable: z.number().min(0).optional().nullable(),

  // Payment details
  paidAmount: z.number().min(0).optional().default(0),
  balance: z.number().optional().nullable(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional().default('PENDING'),
});

// 2. Schema for creating a Payment (all validations are mandatory)
export const createPaymentSchema = basePaymentObject.superRefine((data, ctx) => {
  // 1. Validate Party Type selection
  if (data.partyType === 'VENDOR') {
    if (!data.vendorId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['vendorId'],
        message: 'Vendor must be selected when Party Type is Vendor',
      });
    }
  } else if (data.partyType === 'EMPLOYEE') {
    if (!data.employeeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['employeeId'],
        message: 'Employee must be selected when Party Type is Employee',
      });
    }
  } else if (data.partyType === 'HOUSEHOLD' || data.partyType === 'OTHER') {
    if (!data.partyNameCustom || data.partyNameCustom.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['partyNameCustom'],
        message: 'Party name is required for Household or Other party types',
      });
    }
  }

  // 2. Validate GST Details
  if (data.paymentFrequency !== 'RECURRING' && data.gstApplicable) {
    if (data.gstPercentage === undefined || data.gstPercentage === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['gstPercentage'],
        message: 'GST Percentage is required when GST is applicable',
      });
    }
  }

  // 3. Validate Deduction Details based on deductionType
  if (data.paymentFrequency !== 'RECURRING') {
    if (data.deductionType === 'TDS') {
      if (data.deductionPercentageTDS === undefined || data.deductionPercentageTDS === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['deductionPercentageTDS'],
          message: 'TDS percentage is required for TDS deduction type',
        });
      }
    } else if (data.deductionType === 'PT') {
      if (data.ptAmountFixed === undefined || data.ptAmountFixed === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ptAmountFixed'],
          message: 'PT amount is required for Professional Tax deduction type',
        });
      }
    } else if (data.deductionType === 'OTHER') {
      if (data.deductionPercentageOther === undefined || data.deductionPercentageOther === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['deductionPercentageOther'],
          message: 'Other deduction percentage is required for Other deduction type',
        });
      }
    }
  }
});

// 3. Schema for bulk creating Payments
export const bulkCreatePaymentSchema = z.object({
  payments: z.array(createPaymentSchema).min(1, 'At least one payment is required for bulk upload'),
});

// 4. Schema for updating a Payment (all fields optional, refinement is defensive)
export const updatePaymentSchema = basePaymentObject.partial().superRefine((data, ctx) => {
  // Only apply refinements if the field triggers are actually updated in the payload

  // 1. Validate Party Type selection if partyType is provided
  if (data.partyType !== undefined) {
    if (data.partyType === 'VENDOR') {
      if (data.vendorId === undefined || data.vendorId === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['vendorId'],
          message: 'Vendor must be selected when Party Type is Vendor',
        });
      }
    } else if (data.partyType === 'EMPLOYEE') {
      if (data.employeeId === undefined || data.employeeId === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['employeeId'],
          message: 'Employee must be selected when Party Type is Employee',
        });
      }
    } else if (data.partyType === 'HOUSEHOLD' || data.partyType === 'OTHER') {
      if (data.partyNameCustom === undefined || data.partyNameCustom === null || data.partyNameCustom.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['partyNameCustom'],
          message: 'Party name is required for Household or Other party types',
        });
      }
    }
  }

  // 2. Validate GST Details if gstApplicable is provided
  if (data.paymentFrequency !== 'RECURRING' && data.gstApplicable !== undefined && data.gstApplicable === true) {
    if (data.gstPercentage === undefined || data.gstPercentage === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['gstPercentage'],
        message: 'GST Percentage is required when GST is applicable',
      });
    }
  }

  // 3. Validate Deduction Details if deductionType is provided
  if (data.paymentFrequency !== 'RECURRING' && data.deductionType !== undefined) {
    if (data.deductionType === 'TDS') {
      if (data.deductionPercentageTDS === undefined || data.deductionPercentageTDS === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['deductionPercentageTDS'],
          message: 'TDS percentage is required for TDS deduction type',
        });
      }
    } else if (data.deductionType === 'PT') {
      if (data.ptAmountFixed === undefined || data.ptAmountFixed === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ptAmountFixed'],
          message: 'PT amount is required for Professional Tax deduction type',
        });
      }
    } else if (data.deductionType === 'OTHER') {
      if (data.deductionPercentageOther === undefined || data.deductionPercentageOther === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['deductionPercentageOther'],
          message: 'Other deduction percentage is required for Other deduction type',
        });
      }
    }
  }
});
