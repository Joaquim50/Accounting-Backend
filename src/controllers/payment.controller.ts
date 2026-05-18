import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { createPaymentSchema, updatePaymentSchema } from '../validators/payment.validator';
import { PaymentFrequency, PartyType, DeductionType, PaymentStatus } from '@prisma/client';

// 1. Get all payments with filters and pagination
export const getPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      search,
      paymentFrequency,
      partyType,
      paymentStatus,
      startDate,
      endDate,
      page,
      limit,
    } = req.query;

    const result = await PaymentService.getPayments({
      search: search as string,
      paymentFrequency: paymentFrequency as PaymentFrequency,
      partyType: partyType as PartyType,
      paymentStatus: paymentStatus as PaymentStatus,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
    });

    res.json({
      success: true,
      message: 'Payments retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get payment by ID
export const getPaymentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const payment = await PaymentService.getPaymentById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    res.json({
      success: true,
      message: 'Payment record retrieved successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Create a new payment record
export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedData = createPaymentSchema.parse(req.body);
    const payment = await PaymentService.createPayment(parsedData);

    res.status(201).json({
      success: true,
      message: 'Payment record created successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update an existing payment record
export const updatePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const parsedData = updatePaymentSchema.parse(req.body);

    const payment = await PaymentService.updatePayment(id, parsedData);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    res.json({
      success: true,
      message: 'Payment record updated successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Delete payment record
export const deletePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const isHardDelete = req.query.hard === 'true';

    const result = await PaymentService.deletePayment(id, isHardDelete);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    res.json({
      success: true,
      message: result.type === 'HARD'
        ? 'Payment permanently deleted'
        : 'Payment soft deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
