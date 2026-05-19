import { z } from 'zod';
import { ProformaInvoiceStatus, TaxInvoiceStatus } from '@prisma/client';

const dateSchema = z.union([
  z.date(),
  z.string().transform((val) => new Date(val)),
]);

// Base schema for Proforma Invoices (PI)
export const baseProformaInvoiceObject = z.object({
  piDate: dateSchema,
  clientId: z.string().uuid({ message: 'Valid Client UUID is required' }),
  projectId: z.string().uuid({ message: 'Valid Project UUID is required' }).optional().nullable(),
  milestoneId: z.string().uuid({ message: 'Valid Milestone UUID is required' }).optional().nullable(),
  baseAmount: z.number().positive({ message: 'Base amount must be greater than 0' }),
  gstPercentage: z.number().min(0, { message: 'GST percentage must be at least 0' }).max(100).default(0),
  tdsPercentage: z.number().min(0, { message: 'TDS percentage must be at least 0' }).max(100).default(0),
  notes: z.string().optional().nullable(),
});

export const createProformaInvoiceSchema = baseProformaInvoiceObject;

export const updateProformaInvoiceSchema = baseProformaInvoiceObject.partial();

export const updateProformaInvoiceStatusSchema = z.object({
  status: z.nativeEnum(ProformaInvoiceStatus),
});

export const recordPaymentSchema = z.object({
  receivedAmount: z.number().min(0, { message: 'Received amount must be 0 or positive' }),
  remarks: z.string().optional().nullable(),
});

// Base schema for Tax Invoices (TI)
export const taxInvoiceCoreObject = z.object({
  tiDate: dateSchema,
  piId: z.string().uuid({ message: 'Valid PI UUID is required' }).optional().nullable(),
  
  // Fields required when direct (no piId provided)
  clientId: z.string().uuid({ message: 'Valid Client UUID is required' }).optional().nullable(),
  projectId: z.string().uuid({ message: 'Valid Project UUID is required' }).optional().nullable(),
  milestoneId: z.string().uuid({ message: 'Valid Milestone UUID is required' }).optional().nullable(),
  baseAmount: z.number().positive({ message: 'Base amount must be greater than 0' }).optional().nullable(),
  gstPercentage: z.number().min(0).max(100).optional().nullable().default(0),
  tdsPercentage: z.number().min(0).max(100).optional().nullable().default(0),
  notes: z.string().optional().nullable(),
});

export const createTaxInvoiceSchema = taxInvoiceCoreObject.superRefine((data, ctx) => {
  if (!data.piId) {
    if (!data.clientId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['clientId'],
        message: 'Client ID is required for a direct Tax Invoice (no linked PI)',
      });
    }
    if (!data.baseAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['baseAmount'],
        message: 'Base amount is required for a direct Tax Invoice (no linked PI)',
      });
    }
  }
});

export const updateTaxInvoiceSchema = taxInvoiceCoreObject.partial();

export const updateTaxInvoiceStatusSchema = z.object({
  status: z.nativeEnum(TaxInvoiceStatus),
});
