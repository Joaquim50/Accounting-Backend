import { z } from 'zod';
import { AMCBillingFrequency, AMCStatus, PIStatus, TIStatus, AMCPaymentStatus, PaymentMatchStatus } from '@prisma/client';

// Support both Date objects (pre-parsed) and ISO string format inputs
const dateSchema = z.union([
  z.date(),
  z.string().transform((val) => new Date(val)),
]);

// Define the base object schema separately to enable .partial() scaling
export const baseAMCObjectSchema = z.object({
  customerId: z.string().uuid({ message: 'Valid Customer UUID is required' }),
  amcName: z.string().min(1, { message: 'AMC Name is required' }),
  startDate: dateSchema,
  endDate: dateSchema,
  billingFrequency: z.nativeEnum(AMCBillingFrequency),
  status: z.nativeEnum(AMCStatus).optional().default(AMCStatus.ACTIVE),
  baseAmountPerCycle: z.number().positive({ message: 'Base amount per cycle must be greater than 0' }),
  gstPercentage: z.number().min(0, { message: 'GST percentage must be at least 0' }).default(0),
  tdsPercentage: z.number().min(0, { message: 'TDS percentage must be at least 0' }).default(0),
  nextBillingDate: dateSchema.optional(),
  notes: z.string().optional().nullable(),
});

// Create AMC validation schema
export const createAMCSchema = baseAMCObjectSchema.superRefine((data, ctx) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  if (end.getTime() <= start.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End date must be strictly after the start date',
      path: ['endDate'],
    });
  }

  if (data.nextBillingDate) {
    const nextBill = new Date(data.nextBillingDate);
    if (nextBill.getTime() < start.getTime() || nextBill.getTime() > end.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Next billing date must be between start date and end date',
        path: ['nextBillingDate'],
      });
    }
  }
});

// Update AMC validation schema (partial version of base object schema)
export const updateAMCSchema = baseAMCObjectSchema.partial().superRefine((data, ctx) => {
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end.getTime() <= start.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be strictly after the start date',
        path: ['endDate'],
      });
    }
  }
});

export const updateAMCStatusSchema = z.object({
  status: z.nativeEnum(AMCStatus),
});

export const updateBillingCyclePaymentSchema = z.object({
  receivedAmount: z.number().min(0, { message: 'Received amount must be 0 or positive' }),
  remarks: z.string().optional().nullable(),
});

export const updateCyclePiTiSchema = z.object({
  piStatus: z.nativeEnum(PIStatus).optional(),
  tiStatus: z.nativeEnum(TIStatus).optional(),
  remarks: z.string().optional().nullable(),
});

export const markPaymentMatchedSchema = z.object({
  paymentMatchStatus: z.nativeEnum(PaymentMatchStatus),
});
