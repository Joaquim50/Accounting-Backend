"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTaxInvoiceStatusSchema = exports.updateTaxInvoiceSchema = exports.createTaxInvoiceSchema = exports.taxInvoiceCoreObject = exports.recordPaymentSchema = exports.updateProformaInvoiceStatusSchema = exports.updateProformaInvoiceSchema = exports.createProformaInvoiceSchema = exports.baseProformaInvoiceObject = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const dateSchema = zod_1.z.union([
    zod_1.z.date(),
    zod_1.z.string().transform((val) => new Date(val)),
]);
// Base schema for Proforma Invoices (PI)
exports.baseProformaInvoiceObject = zod_1.z.object({
    piDate: dateSchema,
    clientId: zod_1.z.string().uuid({ message: 'Valid Client UUID is required' }),
    projectId: zod_1.z.string().uuid({ message: 'Valid Project UUID is required' }).optional().nullable(),
    milestoneId: zod_1.z.string().uuid({ message: 'Valid Milestone UUID is required' }).optional().nullable(),
    baseAmount: zod_1.z.number().positive({ message: 'Base amount must be greater than 0' }),
    gstPercentage: zod_1.z.number().min(0, { message: 'GST percentage must be at least 0' }).max(100).default(0),
    tdsPercentage: zod_1.z.number().min(0, { message: 'TDS percentage must be at least 0' }).max(100).default(0),
    notes: zod_1.z.string().optional().nullable(),
});
exports.createProformaInvoiceSchema = exports.baseProformaInvoiceObject;
exports.updateProformaInvoiceSchema = exports.baseProformaInvoiceObject.partial().extend({
    amountReceived: zod_1.z.number().min(0).optional().nullable(),
    status: zod_1.z.nativeEnum(client_1.ProformaInvoiceStatus).optional(),
});
exports.updateProformaInvoiceStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.ProformaInvoiceStatus),
});
exports.recordPaymentSchema = zod_1.z.object({
    receivedAmount: zod_1.z.number().min(0, { message: 'Received amount must be 0 or positive' }),
    remarks: zod_1.z.string().optional().nullable(),
});
// Base schema for Tax Invoices (TI)
exports.taxInvoiceCoreObject = zod_1.z.object({
    tiDate: dateSchema,
    piId: zod_1.z.string().uuid({ message: 'Valid PI UUID is required' }).optional().nullable(),
    // Fields required when direct (no piId provided)
    clientId: zod_1.z.string().uuid({ message: 'Valid Client UUID is required' }).optional().nullable(),
    projectId: zod_1.z.string().uuid({ message: 'Valid Project UUID is required' }).optional().nullable(),
    milestoneId: zod_1.z.string().uuid({ message: 'Valid Milestone UUID is required' }).optional().nullable(),
    baseAmount: zod_1.z.number().positive({ message: 'Base amount must be greater than 0' }).optional().nullable(),
    gstPercentage: zod_1.z.number().min(0).max(100).optional().nullable().default(0),
    tdsPercentage: zod_1.z.number().min(0).max(100).optional().nullable().default(0),
    notes: zod_1.z.string().optional().nullable(),
});
exports.createTaxInvoiceSchema = exports.taxInvoiceCoreObject.superRefine((data, ctx) => {
    if (!data.piId) {
        if (!data.clientId) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['clientId'],
                message: 'Client ID is required for a direct Tax Invoice (no linked PI)',
            });
        }
        if (!data.baseAmount) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['baseAmount'],
                message: 'Base amount is required for a direct Tax Invoice (no linked PI)',
            });
        }
    }
});
exports.updateTaxInvoiceSchema = exports.taxInvoiceCoreObject.partial().extend({
    amountReceived: zod_1.z.number().min(0).optional().nullable(),
    status: zod_1.z.nativeEnum(client_1.TaxInvoiceStatus).optional(),
});
exports.updateTaxInvoiceStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.TaxInvoiceStatus),
});
