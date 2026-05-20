import { z } from 'zod';

export const vendorSchema = z.object({
  vendorType: z.enum(['INDIVIDUAL', 'COMPANY']),
  companyName: z.string().optional().nullable(),
  vendorName: z.string().min(2, "Vendor name is required"),
  phoneNumber: z.string().regex(/^[0-9]{10}$/, "Must be a valid 10-digit Indian phone number"),
  email: z.string().email("Invalid email format"),
  ccEmails: z.array(z.string().email("Invalid CC email format")).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),

  // Tax Details
  gstApplicable: z.boolean().optional(),
  gstinNumber: z.string().optional().nullable(),
  verifiedGstinName: z.string().optional().nullable(),
  panNumber: z.string().optional().nullable(),
  panName: z.string().optional().nullable(),
  tdsApplicable: z.boolean().optional(),
  tdsSection: z.string().optional().nullable(),
  tdsPercentage: z.number().min(0).max(100).optional().nullable(),

  // Address Details
  addressLine1: z.string().min(5, "Address Line 1 is required"),
  addressLine2: z.string().optional().nullable(),
  country: z.string().default("India"),
  state: z.string().min(2, "State is required"),
  city: z.string().min(2, "City is required"),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Must be a valid 6-digit Indian pincode"),

  // Bank Details
  bankAccountHolderName: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
  bankIfscCode: z.string().optional().nullable(),
  bankSwiftCode: z.string().optional().nullable(),
  bankBranchName: z.string().optional().nullable()
}).superRefine((data, ctx) => {
  // 1. Conditional companyName validation
  if (data.vendorType === 'COMPANY') {
    if (!data.companyName || data.companyName.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company name is required for COMPANY vendor type",
        path: ["companyName"]
      });
    }
  }

  // 2. GST validation
  if (data.gstApplicable) {
    if (!data.gstinNumber || !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/.test(data.gstinNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be a valid 15-digit GSTIN number",
        path: ["gstinNumber"]
      });
    }
  }

  // 3. PAN validation if provided
  if (data.panNumber && data.panNumber !== "") {
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.panNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be a valid Indian PAN format (e.g. AABCU9603R)",
        path: ["panNumber"]
      });
    }
  }

  // 4. IFSC validation if provided
  if (data.bankIfscCode && data.bankIfscCode !== "") {
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.bankIfscCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be a valid 11-digit IFSC code (e.g. HDFC0001234)",
        path: ["bankIfscCode"]
      });
    }
  }
});

export const bulkCreateVendorSchema = z.object({
  vendors: z.array(vendorSchema).min(1, 'At least one vendor is required for bulk upload'),
});

