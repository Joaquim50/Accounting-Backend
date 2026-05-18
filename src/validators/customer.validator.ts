import { z } from 'zod';

export const customerSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactPerson: z.string().min(2, "Contact person is required"),
  phoneNumber: z.string().regex(/^[0-9]{10}$/, "Must be a valid 10-digit Indian phone number"),
  email: z.string().email("Invalid email format"),
  ccEmails: z.array(z.string().email("Invalid CC email format")).optional(),
  addressLine1: z.string().min(5, "Address Line 1 is required"),
  addressLine2: z.string().optional(),
  country: z.string().min(2, "Country is required"),
  state: z.string().min(2, "State is required"),
  city: z.string().min(2, "City is required"),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Must be a valid 6-digit Indian pincode"),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),

  // Tax Details
  gstApplicable: z.boolean().optional(),
  gstinNumber: z.string().optional(), // Regex validation can be complex, skipping strict regex for now
  verifiedGstinName: z.string().optional(),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Must be a valid Indian PAN format").optional().or(z.literal('')),
  tdsApplicable: z.boolean().optional(),
  tdsPercentage: z.number().min(0).max(100).optional()
});
