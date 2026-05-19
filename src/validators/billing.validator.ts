import { z } from 'zod';

export const getBillingTrackerQuerySchema = z.object({
  page: z.string().optional().transform(val => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform(val => (val ? parseInt(val, 10) : 10)),
  search: z.string().optional(),
  customerId: z.string().uuid().optional(),
  billingType: z.enum(['MILESTONE_BASED', 'AMC', 'ONE_TIME', 'MONTHLY_RETAINER']).optional(),
  paymentStatus: z.enum(['PENDING', 'PARTIAL', 'PAID', 'MATCHED', 'SHORTFALL']).optional(),
  piStatus: z.enum(['NOT_RAISED', 'DRAFT', 'SENT', 'UPLOADED', 'PAID', 'SHORTFALL', 'CANCELLED']).optional(),
  tiStatus: z.enum(['NOT_CREATED', 'DRAFT', 'GENERATED', 'UPLOADED', 'CANCELLED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  projectId: z.string().uuid().optional(),
});
