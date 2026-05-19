import { Request, Response, NextFunction } from 'express';
import { ProjectedSaleService } from '../services/projectedSale.service';
import {
  createProjectedSaleSchema,
  updateProjectedSaleSchema,
  updateProjectedSaleStatusSchema,
  singleMilestoneSchema
} from '../validators/projectedSale.validator';
import { ProjectType, BillingType, ProjectedSaleStatus } from '@prisma/client';

// 1. Get all projected sales with filters, search, and pagination
export const getProjectedSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      search,
      customerId,
      projectType,
      billingType,
      status,
      startDate,
      endDate,
      page,
      limit,
    } = req.query;

    const result = await ProjectedSaleService.getProjectedSales({
      search: search as string,
      customerId: customerId as string,
      projectType: projectType as ProjectType,
      billingType: billingType as BillingType,
      status: status as ProjectedSaleStatus,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
    });

    res.json({
      success: true,
      message: 'Projected sales retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get projected sale by ID
export const getProjectedSaleById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const sale = await ProjectedSaleService.getProjectedSaleById(id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Projected sale not found',
      });
    }

    res.json({
      success: true,
      message: 'Projected sale retrieved successfully',
      data: sale,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Create a new projected sale
export const createProjectedSale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedData = createProjectedSaleSchema.parse(req.body);
    
    // Auth context (createdBy)
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User session not found.',
      });
    }

    const sale = await ProjectedSaleService.createProjectedSale(parsedData, userId);

    res.status(201).json({
      success: true,
      message: 'Projected sale created successfully',
      data: sale,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update an existing projected sale
export const updateProjectedSale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const parsedData = updateProjectedSaleSchema.parse(req.body);

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User session not found.',
      });
    }

    const sale = await ProjectedSaleService.updateProjectedSale(id, parsedData, userId);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Projected sale not found',
      });
    }

    res.json({
      success: true,
      message: 'Projected sale updated successfully',
      data: sale,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Update projected sale status separate route
export const updateProjectedSaleStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { status } = updateProjectedSaleStatusSchema.parse(req.body);

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User session not found.',
      });
    }

    const sale = await ProjectedSaleService.updateStatus(id, status, userId);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Projected sale not found',
      });
    }

    res.json({
      success: true,
      message: 'Projected sale status updated successfully',
      data: sale,
    });
  } catch (error) {
    next(error);
  }
};

// 6. Delete projected sale (Soft/Hard delete)
export const deleteProjectedSale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const isHardDelete = req.query.hard === 'true';

    const result = await ProjectedSaleService.deleteProjectedSale(id, isHardDelete);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Projected sale not found',
      });
    }

    res.json({
      success: true,
      message: result.type === 'HARD'
        ? 'Projected sale permanently deleted'
        : 'Projected sale soft deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// Milestone Management Endpoints
// ==========================================

// A. Add Milestone to Projected Sale
export const addMilestone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const saleId = req.params.id as string;
    const parsedData = singleMilestoneSchema.parse(req.body);

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User session not found.',
      });
    }

    const milestone = await ProjectedSaleService.addMilestone(saleId, parsedData, userId);

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Projected sale not found',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Milestone added successfully',
      data: milestone,
    });
  } catch (error) {
    next(error);
  }
};

// B. Edit Milestone in Projected Sale
export const updateMilestone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const saleId = req.params.id as string;
    const milestoneId = req.params.milestoneId as string;
    const parsedData = singleMilestoneSchema.partial().parse(req.body);

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User session not found.',
      });
    }

    const milestone = await ProjectedSaleService.updateMilestone(saleId, milestoneId, parsedData, userId);

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Projected sale or milestone not found',
      });
    }

    res.json({
      success: true,
      message: 'Milestone updated successfully',
      data: milestone,
    });
  } catch (error) {
    next(error);
  }
};

// C. Delete Milestone from Projected Sale
export const deleteMilestone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const saleId = req.params.id as string;
    const milestoneId = req.params.milestoneId as string;

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User session not found.',
      });
    }

    const result = await ProjectedSaleService.deleteMilestone(saleId, milestoneId, userId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Projected sale or milestone not found',
      });
    }

    res.json({
      success: true,
      message: 'Milestone deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
