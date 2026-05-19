"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markPaymentMatchedSchema = exports.updateCyclePiTiSchema = exports.updateBillingCyclePaymentSchema = exports.updateAMCStatusSchema = exports.updateAMCSchema = exports.createAMCSchema = exports.baseAMCObjectSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
// Support both Date objects (pre-parsed) and ISO string format inputs
const dateSchema = zod_1.z.union([
    zod_1.z.date(),
    zod_1.z.string().transform((val) => new Date(val)),
]);
// Define the base object schema separately to enable .partial() scaling
exports.baseAMCObjectSchema = zod_1.z.object({
    customerId: zod_1.z.string().uuid({ message: 'Valid Customer UUID is required' }),
    amcName: zod_1.z.string().min(1, { message: 'AMC Name is required' }),
    startDate: dateSchema,
    endDate: dateSchema,
    billingFrequency: zod_1.z.nativeEnum(client_1.AMCBillingFrequency),
    status: zod_1.z.nativeEnum(client_1.AMCStatus).optional().default(client_1.AMCStatus.ACTIVE),
    baseAmountPerCycle: zod_1.z.number().positive({ message: 'Base amount per cycle must be greater than 0' }),
    gstPercentage: zod_1.z.number().min(0, { message: 'GST percentage must be at least 0' }).default(0),
    tdsPercentage: zod_1.z.number().min(0, { message: 'TDS percentage must be at least 0' }).default(0),
    nextBillingDate: dateSchema.optional(),
    notes: zod_1.z.string().optional().nullable(),
});
// Create AMC validation schema
exports.createAMCSchema = exports.baseAMCObjectSchema.superRefine((data, ctx) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end.getTime() <= start.getTime()) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'End date must be strictly after the start date',
            path: ['endDate'],
        });
    }
    if (data.nextBillingDate) {
        const nextBill = new Date(data.nextBillingDate);
        if (nextBill.getTime() < start.getTime() || nextBill.getTime() > end.getTime()) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: 'Next billing date must be between start date and end date',
                path: ['nextBillingDate'],
            });
        }
    }
});
// Update AMC validation schema (partial version of base object schema)
exports.updateAMCSchema = exports.baseAMCObjectSchema.partial().superRefine((data, ctx) => {
    if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        if (end.getTime() <= start.getTime()) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: 'End date must be strictly after the start date',
                path: ['endDate'],
            });
        }
    }
});
exports.updateAMCStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.AMCStatus),
});
exports.updateBillingCyclePaymentSchema = zod_1.z.object({
    receivedAmount: zod_1.z.number().min(0, { message: 'Received amount must be 0 or positive' }),
    remarks: zod_1.z.string().optional().nullable(),
});
exports.updateCyclePiTiSchema = zod_1.z.object({
    piStatus: zod_1.z.nativeEnum(client_1.PIStatus).optional(),
    tiStatus: zod_1.z.nativeEnum(client_1.TIStatus).optional(),
    remarks: zod_1.z.string().optional().nullable(),
});
exports.markPaymentMatchedSchema = zod_1.z.object({
    paymentMatchStatus: zod_1.z.nativeEnum(client_1.PaymentMatchStatus),
});
