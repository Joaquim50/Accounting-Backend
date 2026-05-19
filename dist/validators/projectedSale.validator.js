"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.singleMilestoneSchema = exports.updateProjectedSaleStatusSchema = exports.updateProjectedSaleSchema = exports.createProjectedSaleSchema = exports.baseProjectedSaleObject = exports.milestoneSchema = exports.milestoneStatusEnum = exports.amcBillingCycleEnum = exports.statusEnum = exports.billingTypeEnum = exports.projectTypeEnum = void 0;
const zod_1 = require("zod");
exports.projectTypeEnum = zod_1.z.enum([
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
exports.billingTypeEnum = zod_1.z.enum([
    'MILESTONE_BASED',
    'AMC',
    'ONE_TIME',
    'MONTHLY_RETAINER'
]);
exports.statusEnum = zod_1.z.enum([
    'LEAD',
    'PROPOSAL_SENT',
    'NEGOTIATION',
    'WON',
    'LOST',
    'CANCELLED'
]);
exports.amcBillingCycleEnum = zod_1.z.enum([
    'MONTHLY',
    'YEARLY'
]);
exports.milestoneStatusEnum = zod_1.z.enum([
    'PENDING',
    'INVOICED',
    'PAID',
    'CANCELLED'
]);
// Validator for a single milestone
exports.milestoneSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    milestoneName: zod_1.z.string().min(1, 'Milestone name is required'),
    percentage: zod_1.z.number().min(0, 'Percentage cannot be negative').max(100, 'Percentage cannot exceed 100'),
    dueDate: zod_1.z.string().transform((val) => new Date(val)),
    status: exports.milestoneStatusEnum.optional().default('PENDING'),
});
// Base schema for projected sales
exports.baseProjectedSaleObject = zod_1.z.object({
    customerId: zod_1.z.string().uuid('Invalid customer ID'),
    projectName: zod_1.z.string().min(2, 'Project name must be at least 2 characters long'),
    projectType: exports.projectTypeEnum,
    billingType: exports.billingTypeEnum,
    totalValue: zod_1.z.number().min(0, 'Total value cannot be negative'),
    startDate: zod_1.z.string().transform((val) => new Date(val)),
    endDate: zod_1.z.string().transform((val) => new Date(val)),
    gstPercentage: zod_1.z.number().min(0).max(100).optional().default(0),
    tdsPercentage: zod_1.z.number().min(0).max(100).optional().default(0),
    status: exports.statusEnum.optional().default('LEAD'),
    notes: zod_1.z.string().optional().nullable(),
    // AMC specific
    amcDurationMonths: zod_1.z.number().int().min(1).optional().nullable(),
    amcBillingCycle: exports.amcBillingCycleEnum.optional().nullable(),
    // Retainer specific
    monthlyRetainerAmount: zod_1.z.number().min(0).optional().nullable(),
    retainerDurationMonths: zod_1.z.number().int().min(1).optional().nullable(),
    // Milestone list (optional on base, required under refinement for milestone billing)
    milestones: zod_1.z.array(exports.milestoneSchema).optional().nullable(),
});
// Schema for creating projected sales
exports.createProjectedSaleSchema = exports.baseProjectedSaleObject.superRefine((data, ctx) => {
    // Validate dates: start date must be before end date
    if (data.startDate > data.endDate) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['endDate'],
            message: 'End date must be after start date',
        });
    }
    // 1. MILESTONE_BASED validations
    if (data.billingType === 'MILESTONE_BASED') {
        if (!data.milestones || data.milestones.length === 0) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['milestones'],
                message: 'At least one milestone is required for Milestone Based billing',
            });
        }
        else {
            // Check total percentage equals 100%
            const totalPercentage = data.milestones.reduce((sum, ms) => sum + ms.percentage, 0);
            if (Math.abs(totalPercentage - 100) > 0.01) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
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
                code: zod_1.z.ZodIssueCode.custom,
                path: ['amcDurationMonths'],
                message: 'AMC duration is required when billing type is AMC',
            });
        }
        if (data.amcBillingCycle === undefined || data.amcBillingCycle === null) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['amcBillingCycle'],
                message: 'AMC billing cycle (monthly/yearly) is required when billing type is AMC',
            });
        }
    }
    // 3. MONTHLY_RETAINER validations
    if (data.billingType === 'MONTHLY_RETAINER') {
        if (data.monthlyRetainerAmount === undefined || data.monthlyRetainerAmount === null) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['monthlyRetainerAmount'],
                message: 'Monthly retainer amount is required when billing type is Monthly Retainer',
            });
        }
        if (data.retainerDurationMonths === undefined || data.retainerDurationMonths === null) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['retainerDurationMonths'],
                message: 'Retainer contract duration (months) is required when billing type is Monthly Retainer',
            });
        }
    }
});
// Schema for updating projected sales (all fields optional, but applying same refinements conditionally)
exports.updateProjectedSaleSchema = exports.baseProjectedSaleObject.partial().superRefine((data, ctx) => {
    // Validate dates if both are provided
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['endDate'],
            message: 'End date must be after start date',
        });
    }
    // If billingType is modified to MILESTONE_BASED, validate milestones
    if (data.billingType === 'MILESTONE_BASED') {
        if (data.milestones !== undefined) {
            if (!data.milestones || data.milestones.length === 0) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    path: ['milestones'],
                    message: 'At least one milestone is required for Milestone Based billing',
                });
            }
            else {
                const totalPercentage = data.milestones.reduce((sum, ms) => sum + ms.percentage, 0);
                if (Math.abs(totalPercentage - 100) > 0.01) {
                    ctx.addIssue({
                        code: zod_1.z.ZodIssueCode.custom,
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
                code: zod_1.z.ZodIssueCode.custom,
                path: ['amcDurationMonths'],
                message: 'AMC duration is required when billing type is AMC',
            });
        }
        if (data.amcBillingCycle === null) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['amcBillingCycle'],
                message: 'AMC billing cycle is required when billing type is AMC',
            });
        }
    }
    // If billingType is modified to MONTHLY_RETAINER, validate retainer amount and duration
    if (data.billingType === 'MONTHLY_RETAINER') {
        if (data.monthlyRetainerAmount === null) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['monthlyRetainerAmount'],
                message: 'Monthly retainer amount is required when billing type is Monthly Retainer',
            });
        }
        if (data.retainerDurationMonths === null) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['retainerDurationMonths'],
                message: 'Retainer duration is required when billing type is Monthly Retainer',
            });
        }
    }
});
// Schema for updating status separately
exports.updateProjectedSaleStatusSchema = zod_1.z.object({
    status: exports.statusEnum
});
// Schema for individual milestone creation/modification
exports.singleMilestoneSchema = zod_1.z.object({
    milestoneName: zod_1.z.string().min(1, 'Milestone name is required'),
    percentage: zod_1.z.number().min(0).max(100),
    dueDate: zod_1.z.string().transform((val) => new Date(val)),
    status: exports.milestoneStatusEnum.optional().default('PENDING')
});
