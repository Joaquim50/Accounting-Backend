"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBillingTrackerQuerySchema = void 0;
const zod_1 = require("zod");
exports.getBillingTrackerQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform(val => (val ? parseInt(val, 10) : 1)),
    limit: zod_1.z.string().optional().transform(val => (val ? parseInt(val, 10) : 10)),
    search: zod_1.z.string().optional(),
    customerId: zod_1.z.string().uuid().optional(),
    billingType: zod_1.z.enum(['MILESTONE_BASED', 'AMC', 'ONE_TIME', 'MONTHLY_RETAINER']).optional(),
    paymentStatus: zod_1.z.enum(['PENDING', 'PARTIAL', 'PAID', 'MATCHED', 'SHORTFALL']).optional(),
    piStatus: zod_1.z.enum(['NOT_RAISED', 'DRAFT', 'SENT', 'UPLOADED', 'PAID', 'SHORTFALL', 'CANCELLED']).optional(),
    tiStatus: zod_1.z.enum(['NOT_CREATED', 'DRAFT', 'GENERATED', 'UPLOADED', 'CANCELLED']).optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    projectId: zod_1.z.string().uuid().optional(),
});
