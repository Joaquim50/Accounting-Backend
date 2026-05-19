import { z } from 'zod';

export const projectTypeEnum = z.enum([
  'WEBSITE',
  'WEB_APP',
  'MOBILE_APP',
  'SOFTWARE_DEVELOPMENT',
  'DIGITAL_MARKETING',
  'BRANDING',
  'AMC',
  'RETAINER',
  'ONE_TIME',
  'OTHER'
]);

export const billingTypeEnum = z.enum([
  'MILESTONE_BASED',
  'AMC',
  'ONE_TIME',
  'MONTHLY_RETAINER'
]);

export const statusEnum = z.enum([
  'LEAD',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'WON',
  'LOST',
  'CANCELLED'
]);

export const amcBillingCycleEnum = z.enum([
  'MONTHLY',
  'YEARLY'
]);

export const milestoneStatusEnum = z.enum([
  'PENDING',
  'INVOICED',
  'PAID',
  'CANCELLED'
]);

// Validator for a single milestone
export const milestoneSchema = z.object({
  id: z.string().uuid().optional(),
  milestoneName: z.string().min(1, 'Milestone name is required'),
  percentage: z.number().min(0, 'Percentage cannot be negative').max(100, 'Percentage cannot exceed 100'),
  dueDate: z.string().transform((val) => new Date(val)),
  status: milestoneStatusEnum.optional().default('PENDING'),
});

// Base schema for projected sales
export const baseProjectedSaleObject = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  projectName: z.string().min(2, 'Project name must be at least 2 characters long'),
  projectType: projectTypeEnum,
  billingType: billingTypeEnum,
  totalValue: z.number().min(0, 'Total value cannot be negative'),
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
  gstPercentage: z.number().min(0).max(100).optional().default(0),
  tdsPercentage: z.number().min(0).max(100).optional().default(0),
  status: statusEnum.optional().default('LEAD'),
  notes: z.string().optional().nullable(),

  // AMC specific
  amcDurationMonths: z.number().int().min(1).optional().nullable(),
  amcBillingCycle: amcBillingCycleEnum.optional().nullable(),

  // Retainer specific
  monthlyRetainerAmount: z.number().min(0).optional().nullable(),
  retainerDurationMonths: z.number().int().min(1).optional().nullable(),

  // Milestone list (optional on base, required under refinement for milestone billing)
  milestones: z.array(milestoneSchema).optional().nullable(),
});

// Schema for creating projected sales
export const createProjectedSaleSchema = baseProjectedSaleObject.superRefine((data, ctx) => {
  // Validate dates: start date must be before end date
  if (data.startDate > data.endDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'End date must be after start date',
    });
  }

  // 1. MILESTONE_BASED validations
  if (data.billingType === 'MILESTONE_BASED') {
    if (!data.milestones || data.milestones.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['milestones'],
        message: 'At least one milestone is required for Milestone Based billing',
      });
    } else {
      // Check total percentage equals 100%
      const totalPercentage = data.milestones.reduce((sum, ms) => sum + ms.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['milestones'],
          message: `Total milestone percentage must equal 100%. Current total: ${totalPercentage}%`,
        });
      }
    }
  }

  // 2. AMC validations
  if (data.billingType === 'AMC') {
    if (data.amcDurationMonths === undefined || data.amcDurationMonths === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amcDurationMonths'],
        message: 'AMC duration is required when billing type is AMC',
      });
    }
    if (data.amcBillingCycle === undefined || data.amcBillingCycle === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amcBillingCycle'],
        message: 'AMC billing cycle (monthly/yearly) is required when billing type is AMC',
      });
    }
  }

  // 3. MONTHLY_RETAINER validations
  if (data.billingType === 'MONTHLY_RETAINER') {
    if (data.monthlyRetainerAmount === undefined || data.monthlyRetainerAmount === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['monthlyRetainerAmount'],
        message: 'Monthly retainer amount is required when billing type is Monthly Retainer',
      });
    }
    if (data.retainerDurationMonths === undefined || data.retainerDurationMonths === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['retainerDurationMonths'],
        message: 'Retainer contract duration (months) is required when billing type is Monthly Retainer',
      });
    }
  }
});

// Schema for updating projected sales (all fields optional, but applying same refinements conditionally)
export const updateProjectedSaleSchema = baseProjectedSaleObject.partial().superRefine((data, ctx) => {
  // Validate dates if both are provided
  if (data.startDate && data.endDate && data.startDate > data.endDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'End date must be after start date',
    });
  }

  // If billingType is modified to MILESTONE_BASED, validate milestones
  if (data.billingType === 'MILESTONE_BASED') {
    if (data.milestones !== undefined) {
      if (!data.milestones || data.milestones.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['milestones'],
          message: 'At least one milestone is required for Milestone Based billing',
        });
      } else {
        const totalPercentage = data.milestones.reduce((sum, ms) => sum + ms.percentage, 0);
        if (Math.abs(totalPercentage - 100) > 0.01) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['milestones'],
            message: `Total milestone percentage must equal 100%. Current total: ${totalPercentage}%`,
          });
        }
      }
    }
  }

  // If billingType is modified to AMC, validate duration and cycle
  if (data.billingType === 'AMC') {
    if (data.amcDurationMonths === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amcDurationMonths'],
        message: 'AMC duration is required when billing type is AMC',
      });
    }
    if (data.amcBillingCycle === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amcBillingCycle'],
        message: 'AMC billing cycle is required when billing type is AMC',
      });
    }
  }

  // If billingType is modified to MONTHLY_RETAINER, validate retainer amount and duration
  if (data.billingType === 'MONTHLY_RETAINER') {
    if (data.monthlyRetainerAmount === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['monthlyRetainerAmount'],
        message: 'Monthly retainer amount is required when billing type is Monthly Retainer',
      });
    }
    if (data.retainerDurationMonths === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['retainerDurationMonths'],
        message: 'Retainer duration is required when billing type is Monthly Retainer',
      });
    }
  }
});

// Schema for updating status separately
export const updateProjectedSaleStatusSchema = z.object({
  status: statusEnum
});

// Schema for individual milestone creation/modification
export const singleMilestoneSchema = z.object({
  milestoneName: z.string().min(1, 'Milestone name is required'),
  percentage: z.number().min(0).max(100),
  dueDate: z.string().transform((val) => new Date(val)),
  status: milestoneStatusEnum.optional().default('PENDING')
});
