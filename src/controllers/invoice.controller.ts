import { Request, Response, NextFunction } from 'express';
import { InvoiceService } from '../services/invoice.service';
import {
  createProformaInvoiceSchema,
  updateProformaInvoiceSchema,
  updateProformaInvoiceStatusSchema,
  recordPaymentSchema,
  createTaxInvoiceSchema,
  updateTaxInvoiceSchema,
  updateTaxInvoiceStatusSchema
} from '../validators/invoice.validator';
import { ProformaInvoiceStatus, TaxInvoiceStatus } from '@prisma/client';
import path from 'path';
import fs from 'fs';

// ==========================================
// Proforma Invoice Controllers
// ==========================================

export const createPI = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedData = createProformaInvoiceSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const pi = await InvoiceService.createPI(parsedData, userId);
    res.status(201).json({ success: true, message: 'Proforma Invoice created successfully', data: pi });
  } catch (error) { next(error); }
};

export const updatePI = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const parsedData = updateProformaInvoiceSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const pi = await InvoiceService.updatePI(id, parsedData, userId);
    res.json({ success: true, message: 'Proforma Invoice updated successfully', data: pi });
  } catch (error) { next(error); }
};

export const deletePI = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const isHardDelete = req.query.hard === 'true';
    
    await InvoiceService.deletePI(id, isHardDelete);
    res.json({ success: true, message: isHardDelete ? 'PI hard deleted' : 'PI soft deleted and cancelled' });
  } catch (error) { next(error); }
};

export const getPIById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const pi = await InvoiceService.getPIById(id);
    if (!pi) return res.status(404).json({ success: false, message: 'PI not found' });
    res.json({ success: true, message: 'PI retrieved successfully', data: pi });
  } catch (error) { next(error); }
};

export const getPIs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, clientId, projectId, status, startDate, endDate, paymentStatus, page, limit } = req.query;
    
    const result = await InvoiceService.getPIs({
      search: search as string,
      clientId: clientId as string,
      projectId: projectId as string,
      status: status as ProformaInvoiceStatus,
      startDate: startDate as string,
      endDate: endDate as string,
      paymentStatus: paymentStatus as 'PENDING' | 'PARTIALLY_PAID' | 'PAID',
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
    });
    
    res.json({ success: true, message: 'PIs retrieved successfully', data: result });
  } catch (error) { next(error); }
};

export const updatePIStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { status } = updateProformaInvoiceStatusSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const pi = await InvoiceService.updatePIStatus(id, status as ProformaInvoiceStatus, userId);
    res.json({ success: true, message: 'PI status updated successfully', data: pi });
  } catch (error) { next(error); }
};

export const uploadPIFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;
    const file = req.file;

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const filePath = `/uploads/invoices/${file.filename}`;
    const pi = await InvoiceService.uploadPIFile(id, filePath, userId);
    
    res.json({ success: true, message: 'PI file uploaded successfully', data: pi });
  } catch (error) { next(error); }
};

export const deletePIFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const pi = await InvoiceService.deletePIFile(id, userId);
    res.json({ success: true, message: 'PI file deleted successfully', data: pi });
  } catch (error) { next(error); }
};

export const recordPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { receivedAmount, remarks } = recordPaymentSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const pi = await InvoiceService.recordPIPayment(id, receivedAmount, remarks, userId);
    res.json({ success: true, message: 'Payment recorded successfully', data: pi });
  } catch (error) { next(error); }
};

export const getOutstandingPIs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pis = await InvoiceService.getOutstandingPIs();
    res.json({ success: true, message: 'Outstanding PIs retrieved successfully', data: pis });
  } catch (error) { next(error); }
};

export const getShortfallPIs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pis = await InvoiceService.getShortfallPIs();
    res.json({ success: true, message: 'Shortfall PIs retrieved successfully', data: pis });
  } catch (error) { next(error); }
};

// ==========================================
// Tax Invoice Controllers
// ==========================================

export const generateTIFromPI = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const piId = req.params.piId as string;
    const userId = req.user?.id;
    const { tiDate, notes } = req.body;
    
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!tiDate) return res.status(400).json({ success: false, message: 'tiDate is required' });

    const ti = await InvoiceService.generateTIFromPI(piId, new Date(tiDate), notes, userId);
    res.status(201).json({ success: true, message: 'Tax Invoice generated from PI successfully', data: ti });
  } catch (error) { next(error); }
};

export const createDirectTI = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedData = createTaxInvoiceSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const ti = await InvoiceService.createDirectTI(parsedData, userId);
    res.status(201).json({ success: true, message: 'Direct Tax Invoice created successfully', data: ti });
  } catch (error) { next(error); }
};

export const updateTI = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const parsedData = updateTaxInvoiceSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const ti = await InvoiceService.updateTI(id, parsedData, userId);
    res.json({ success: true, message: 'Tax Invoice updated successfully', data: ti });
  } catch (error) { next(error); }
};

export const deleteTI = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const isHardDelete = req.query.hard === 'true';
    
    await InvoiceService.deleteTI(id, isHardDelete);
    res.json({ success: true, message: isHardDelete ? 'TI hard deleted' : 'TI soft deleted and cancelled' });
  } catch (error) { next(error); }
};

export const getTIById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const ti = await InvoiceService.getTIById(id);
    if (!ti) return res.status(404).json({ success: false, message: 'TI not found' });
    res.json({ success: true, message: 'TI retrieved successfully', data: ti });
  } catch (error) { next(error); }
};

export const getTIs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, clientId, projectId, status, startDate, endDate, page, limit } = req.query;
    
    const result = await InvoiceService.getTIs({
      search: search as string,
      clientId: clientId as string,
      projectId: projectId as string,
      status: status as TaxInvoiceStatus,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
    });
    
    res.json({ success: true, message: 'TIs retrieved successfully', data: result });
  } catch (error) { next(error); }
};

export const updateTIStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { status } = updateTaxInvoiceStatusSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const ti = await InvoiceService.updateTIStatus(id, status as TaxInvoiceStatus, userId);
    res.json({ success: true, message: 'TI status updated successfully', data: ti });
  } catch (error) { next(error); }
};

export const uploadTIFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;
    const file = req.file;

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const filePath = `/uploads/invoices/${file.filename}`;
    const ti = await InvoiceService.uploadTIFile(id, filePath, userId);
    
    res.json({ success: true, message: 'TI file uploaded successfully', data: ti });
  } catch (error) { next(error); }
};

export const deleteTIFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const ti = await InvoiceService.deleteTIFile(id, userId);
    res.json({ success: true, message: 'TI file deleted successfully', data: ti });
  } catch (error) { next(error); }
};
