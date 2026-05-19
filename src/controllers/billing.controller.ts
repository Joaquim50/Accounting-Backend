import { Request, Response, NextFunction } from 'express';
import { BillingService } from '../services/billing.service';
import { getBillingTrackerQuerySchema } from '../validators/billing.validator';

export const getDashboardSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = getBillingTrackerQuerySchema.parse(req.query);
    const summary = await BillingService.getDashboardSummary(filters);
    res.json({
      success: true,
      message: 'Billing dashboard summary retrieved successfully',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

export const getBillingTrackerList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = getBillingTrackerQuerySchema.parse(req.query);
    const result = await BillingService.getBillingTracker(filters);
    res.json({
      success: true,
      message: 'Consolidated billing tracker retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getRowDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const sourceType = req.params.sourceType as string;
    
    if (!id || !sourceType) {
      return res.status(400).json({ success: false, message: 'ID and sourceType are required' });
    }
    const details = await BillingService.getRowDetails(id, sourceType);
    if (!details) {
      return res.status(404).json({ success: false, message: 'Row details not found' });
    }
    res.json({
      success: true,
      message: 'Row details retrieved successfully',
      data: details,
    });
  } catch (error) {
    next(error);
  }
};
