"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePaymentSchema = exports.createPaymentSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
// 1. Base Zod object schema (without refinements)
const basePaymentObject = zod_1.z.object({
    paymentFrequency: zod_1.z.nativeEnum(client_1.PaymentFrequency),
    expenseDate: zod_1.z.string().transform((val) => new Date(val)),
    expenseType: zod_1.z.string().min(1, 'Expense type is required'),
    partyType: zod_1.z.nativeEnum(client_1.PartyType),
    // Custom or related parties
    vendorId: zod_1.z.string().uuid('Invalid vendor ID').optional().nullable(),
    employeeId: zod_1.z.string().uuid('Invalid employee ID').optional().nullable(),
    partyNameCustom: zod_1.z.string().min(1, 'Party name is required').optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
    // Financial details
    baseAmount: zod_1.z.number().min(0, 'Base amount cannot be negative'),
    gstApplicable: zod_1.z.boolean(),
    gstPercentage: zod_1.z.number().min(0).max(100).optional().nullable(),
    gstAmount: zod_1.z.number().min(0).optional().nullable(),
    // Deduction details
    deductionType: zod_1.z.nativeEnum(client_1.DeductionType),
    deductionPercentageTDS: zod_1.z.number().min(0).max(100).optional().nullable(),
    ptAmountFixed: zod_1.z.number().min(0).optional().nullable(),
    deductionPercentageOther: zod_1.z.number().min(0).max(100).optional().nullable(),
    deductionAmount: zod_1.z.number().min(0).optional().nullable(),
    netPayable: zod_1.z.number().min(0).optional().nullable(),
    // Payment details
    paidAmount: zod_1.z.number().min(0).optional().default(0),
    balance: zod_1.z.number().optional().nullable(),
    paymentStatus: zod_1.z.nativeEnum(client_1.PaymentStatus).optional().default('PENDING'),
});
// 2. Schema for creating a Payment (all validations are mandatory)
exports.createPaymentSchema = basePaymentObject.superRefine((data, ctx) => {
    // 1. Validate Party Type selection
    if (data.partyType === 'VENDOR') {
        if (!data.vendorId) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['vendorId'],
                message: 'Vendor must be selected when Party Type is Vendor',
            });
        }
    }
    else if (data.partyType === 'EMPLOYEE') {
        if (!data.employeeId) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['employeeId'],
                message: 'Employee must be selected when Party Type is Employee',
            });
        }
    }
    else if (data.partyType === 'HOUSEHOLD' || data.partyType === 'OTHER') {
        if (!data.partyNameCustom || data.partyNameCustom.trim() === '') {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['partyNameCustom'],
                message: 'Party name is required for Household or Other party types',
            });
        }
    }
    // 2. Validate GST Details
    if (data.gstApplicable) {
        if (data.gstPercentage === undefined || data.gstPercentage === null) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['gstPercentage'],
                message: 'GST Percentage is required when GST is applicable',
            });
        }
    }
    // 3. Validate Deduction Details based on deductionType
    if (data.deductionType === 'TDS') {
        if (data.deductionPercentageTDS === undefined || data.deductionPercentageTDS === null) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['deductionPercentageTDS'],
                message: 'TDS percentage is required for TDS deduction type',
            });
        }
    }
    else if (data.deductionType === 'PT') {
        if (data.ptAmountFixed === undefined || data.ptAmountFixed === null) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['ptAmountFixed'],
                message: 'PT amount is required for Professional Tax deduction type',
            });
        }
    }
    else if (data.deductionType === 'OTHER') {
        if (data.deductionPercentageOther === undefined || data.deductionPercentageOther === null) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['deductionPercentageOther'],
                message: 'Other deduction percentage is required for Other deduction type',
            });
        }
    }
});
// 3. Schema for updating a Payment (all fields optional, refinement is defensive)
exports.updatePaymentSchema = basePaymentObject.partial().superRefine((data, ctx) => {
    // Only apply refinements if the field triggers are actually updated in the payload
    // 1. Validate Party Type selection if partyType is provided
    if (data.partyType !== undefined) {
        if (data.partyType === 'VENDOR') {
            if (data.vendorId === undefined || data.vendorId === null) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    path: ['vendorId'],
                    message: 'Vendor must be selected when Party Type is Vendor',
                });
            }
        }
        else if (data.partyType === 'EMPLOYEE') {
            if (data.employeeId === undefined || data.employeeId === null) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    path: ['employeeId'],
                    message: 'Employee must be selected when Party Type is Employee',
                });
            }
        }
        else if (data.partyType === 'HOUSEHOLD' || data.partyType === 'OTHER') {
            if (data.partyNameCustom === undefined || data.partyNameCustom === null || data.partyNameCustom.trim() === '') {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    path: ['partyNameCustom'],
                    message: 'Party name is required for Household or Other party types',
                });
            }
        }
    }
    // 2. Validate GST Details if gstApplicable is provided
    if (data.gstApplicable !== undefined && data.gstApplicable === true) {
        if (data.gstPercentage === undefined || data.gstPercentage === null) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['gstPercentage'],
                message: 'GST Percentage is required when GST is applicable',
            });
        }
    }
    // 3. Validate Deduction Details if deductionType is provided
    if (data.deductionType !== undefined) {
        if (data.deductionType === 'TDS') {
            if (data.deductionPercentageTDS === undefined || data.deductionPercentageTDS === null) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    path: ['deductionPercentageTDS'],
                    message: 'TDS percentage is required for TDS deduction type',
                });
            }
        }
        else if (data.deductionType === 'PT') {
            if (data.ptAmountFixed === undefined || data.ptAmountFixed === null) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    path: ['ptAmountFixed'],
                    message: 'PT amount is required for Professional Tax deduction type',
                });
            }
        }
        else if (data.deductionType === 'OTHER') {
            if (data.deductionPercentageOther === undefined || data.deductionPercentageOther === null) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    path: ['deductionPercentageOther'],
                    message: 'Other deduction percentage is required for Other deduction type',
                });
            }
        }
    }
});
