"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerSchema = void 0;
const zod_1 = require("zod");
exports.customerSchema = zod_1.z.object({
    companyName: zod_1.z.string().min(2, "Company name is required"),
    contactPerson: zod_1.z.string().min(2, "Contact person is required"),
    phoneNumber: zod_1.z.string().regex(/^[0-9]{10}$/, "Must be a valid 10-digit Indian phone number"),
    email: zod_1.z.string().email("Invalid email format"),
    ccEmails: zod_1.z.array(zod_1.z.string().email("Invalid CC email format")).optional(),
    addressLine1: zod_1.z.string().min(5, "Address Line 1 is required"),
    addressLine2: zod_1.z.string().optional(),
    country: zod_1.z.string().min(2, "Country is required"),
    state: zod_1.z.string().min(2, "State is required"),
    city: zod_1.z.string().min(2, "City is required"),
    pincode: zod_1.z.string().regex(/^[1-9][0-9]{5}$/, "Must be a valid 6-digit Indian pincode"),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).optional(),
    // Tax Details
    gstApplicable: zod_1.z.boolean().optional(),
    gstinNumber: zod_1.z.string().optional(), // Regex validation can be complex, skipping strict regex for now
    verifiedGstinName: zod_1.z.string().optional(),
    panNumber: zod_1.z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Must be a valid Indian PAN format").optional().or(zod_1.z.literal('')),
    tdsApplicable: zod_1.z.boolean().optional(),
    tdsPercentage: zod_1.z.number().min(0).max(100).optional()
});
