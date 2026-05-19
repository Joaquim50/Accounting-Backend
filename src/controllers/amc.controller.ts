import { Request, Response, NextFunction } from 'express';
import { AMCService } from '../services/amc.service';
import {
  createAMCSchema,
  updateAMCSchema,
  updateAMCStatusSchema,
  updateBillingCyclePaymentSchema,
  updateCyclePiTiSchema,
  markPaymentMatchedSchema
} from '../validators/amc.validator';
import { AMCBillingFrequency, AMCStatus, PaymentMatchStatus } from '@prisma/client';

// 1. Create AMC
export const createAMC = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedData = createAMCSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User session not found.',
      });
    }

    const amc = await AMCService.createAMC(parsedData, userId);

    res.status(201).json({
      success: true,
      message: 'AMC created and billing schedule initialized successfully',
      data: amc,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Update AMC
export const updateAMC = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const parsedData = updateAMCSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User session not found.',
      });
    }

    const amc = await AMCService.updateAMC(id, parsedData, userId);

    if (!amc) {
      return res.status(404).json({
        success: false,
        message: 'AMC record not found',
      });
    }

    res.json({
      success: true,
      message: 'AMC details and billing cycles updated successfully',
      data: amc,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Delete AMC (Soft/Hard delete)
export const deleteAMC = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const isHardDelete = req.query.hard === 'true';

    const result = await AMCService.deleteAMC(id, isHardDelete);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'AMC record not found',
      });
    }

    res.json({
      success: true,
      message: result.type === 'HARD'
        ? 'AMC record permanently deleted'
        : 'AMC record soft deleted and marked as CANCELLED successfully',
    });
  } catch (error) {
    next(error);
  }
};

// 4. Get AMC by ID
export const getAMCById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const amc = await AMCService.getAMCById(id);

    if (!amc) {
      return res.status(404).json({
        success: false,
        message: 'AMC record not found',
      });
    }

    res.json({
      success: true,
      message: 'AMC details retrieved successfully',
      data: amc,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Get all AMCs with pagination, search, and filtering
export const getAMCs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      search,
      customerId,
      billingFrequency,
      status,
      startDate,
      endDate,
      page,
      limit,
    } = req.query;

    const result = await AMCService.getAMCs({
      search: search as string,
      customerId: customerId as string,
      billingFrequency: billingFrequency as AMCBillingFrequency,
      status: status as AMCStatus,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
    });

    res.json({
      success: true,
      message: 'AMC records retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// 6. Update AMC Status
export const updateAMCStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { status } = updateAMCStatusSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User session not found.',
      });
    }

    const amc = await AMCService.updateStatus(id, status, userId);

    if (!amc) {
      return res.status(404).json({
        success: false,
        message: 'AMC record not found',
      });
    }

    res.json({
      success: true,
      message: 'AMC status updated successfully',
      data: amc,
    });
  } catch (error) {
    next(error);
  }
};

// 7. Regenerate Billing Cycles On-Demand
export const generateBillingCycles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User session not found.',
      });
    }

    const cycles = await AMCService.generateBillingCycles(id, userId);

    if (!cycles) {
      return res.status(404).json({
        success: false,
        message: 'AMC record not found',
      });
    }

    res.json({
      success: true,
      message: 'Unpaid billing cycles regenerated successfully',
      data: cycles,
    });
  } catch (error) {
    next(error);
  }
};

// 8. Update Billing Cycle Payment details
export const updateBillingCyclePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cycleId = req.params.cycleId as string;
    const parsedData = updateBillingCyclePaymentSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User session not found.',
      });
    }

    const updatedCycle = await AMCService.updateBillingCyclePayment(cycleId, parsedData, userId);

    if (!updatedCycle) {
      return res.status(404).json({
        success: false,
        message: 'Billing cycle or active parent AMC not found',
      });
    }

    res.json({
      success: true,
      message: 'Billing cycle payment information updated successfully',
      data: updatedCycle,
    });
  } catch (error) {
    next(error);
  }
};

// 9. Update PI / TI Statuses
export const updatePiTiStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cycleId = req.params.cycleId as string;
    const parsedData = updateCyclePiTiSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User session not found.',
      });
    }

    const updatedCycle = await AMCService.updatePiTiStatus(cycleId, parsedData, userId);

    if (!updatedCycle) {
      return res.status(404).json({
        success: false,
        message: 'Billing cycle not found',
      });
    }

    res.json({
      success: true,
      message: 'Billing cycle PI/TI invoice statuses updated successfully',
      data: updatedCycle,
    });
  } catch (error) {
    next(error);
  }
};

// 10. Mark Payment Matched
export const markPaymentMatched = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cycleId = req.params.cycleId as string;
    const { paymentMatchStatus } = markPaymentMatchedSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User session not found.',
      });
    }

    const updatedCycle = await AMCService.markPaymentMatched(cycleId, paymentMatchStatus as PaymentMatchStatus, userId);

    if (!updatedCycle) {
      return res.status(404).json({
        success: false,
        message: 'Billing cycle not found',
      });
    }

    res.json({
      success: true,
      message: 'Billing cycle payment match status updated successfully',
      data: updatedCycle,
    });
  } catch (error) {
    next(error);
  }
};

// 11. Get Upcoming Billing Cycles
export const getUpcomingBillingCycles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cycles = await AMCService.getUpcomingBillingCycles();

    res.json({
      success: true,
      message: 'Upcoming unpaid billing cycles fetched successfully',
      data: cycles,
    });
  } catch (error) {
    next(error);
  }
};

// 12. Get Overdue Payments
export const getOverduePayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cycles = await AMCService.getOverduePayments();

    res.json({
      success: true,
      message: 'Overdue unpaid payments fetched successfully',
      data: cycles,
    });
  } catch (error) {
    next(error);
  }
};
