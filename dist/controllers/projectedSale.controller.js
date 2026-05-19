"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMilestone = exports.updateMilestone = exports.addMilestone = exports.deleteProjectedSale = exports.updateProjectedSaleStatus = exports.updateProjectedSale = exports.createProjectedSale = exports.getProjectedSaleById = exports.getProjectedSales = void 0;
const projectedSale_service_1 = require("../services/projectedSale.service");
const projectedSale_validator_1 = require("../validators/projectedSale.validator");
// 1. Get all projected sales with filters, search, and pagination
const getProjectedSales = async (req, res, next) => {
    try {
        const { search, customerId, projectType, billingType, status, startDate, endDate, page, limit, } = req.query;
        const result = await projectedSale_service_1.ProjectedSaleService.getProjectedSales({
            search: search,
            customerId: customerId,
            projectType: projectType,
            billingType: billingType,
            status: status,
            startDate: startDate,
            endDate: endDate,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 10,
        });
        res.json({
            success: true,
            message: 'Projected sales retrieved successfully',
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getProjectedSales = getProjectedSales;
// 2. Get projected sale by ID
const getProjectedSaleById = async (req, res, next) => {
    try {
        const id = req.params.id;
        const sale = await projectedSale_service_1.ProjectedSaleService.getProjectedSaleById(id);
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
    }
    catch (error) {
        next(error);
    }
};
exports.getProjectedSaleById = getProjectedSaleById;
// 3. Create a new projected sale
const createProjectedSale = async (req, res, next) => {
    try {
        const parsedData = projectedSale_validator_1.createProjectedSaleSchema.parse(req.body);
        // Auth context (createdBy)
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. User session not found.',
            });
        }
        const sale = await projectedSale_service_1.ProjectedSaleService.createProjectedSale(parsedData, userId);
        res.status(201).json({
            success: true,
            message: 'Projected sale created successfully',
            data: sale,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createProjectedSale = createProjectedSale;
// 4. Update an existing projected sale
const updateProjectedSale = async (req, res, next) => {
    try {
        const id = req.params.id;
        const parsedData = projectedSale_validator_1.updateProjectedSaleSchema.parse(req.body);
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. User session not found.',
            });
        }
        const sale = await projectedSale_service_1.ProjectedSaleService.updateProjectedSale(id, parsedData, userId);
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
    }
    catch (error) {
        next(error);
    }
};
exports.updateProjectedSale = updateProjectedSale;
// 5. Update projected sale status separate route
const updateProjectedSaleStatus = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { status } = projectedSale_validator_1.updateProjectedSaleStatusSchema.parse(req.body);
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. User session not found.',
            });
        }
        const sale = await projectedSale_service_1.ProjectedSaleService.updateStatus(id, status, userId);
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
    }
    catch (error) {
        next(error);
    }
};
exports.updateProjectedSaleStatus = updateProjectedSaleStatus;
// 6. Delete projected sale (Soft/Hard delete)
const deleteProjectedSale = async (req, res, next) => {
    try {
        const id = req.params.id;
        const isHardDelete = req.query.hard === 'true';
        const result = await projectedSale_service_1.ProjectedSaleService.deleteProjectedSale(id, isHardDelete);
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
    }
    catch (error) {
        next(error);
    }
};
exports.deleteProjectedSale = deleteProjectedSale;
// ==========================================
// Milestone Management Endpoints
// ==========================================
// A. Add Milestone to Projected Sale
const addMilestone = async (req, res, next) => {
    try {
        const saleId = req.params.id;
        const parsedData = projectedSale_validator_1.singleMilestoneSchema.parse(req.body);
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. User session not found.',
            });
        }
        const milestone = await projectedSale_service_1.ProjectedSaleService.addMilestone(saleId, parsedData, userId);
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
    }
    catch (error) {
        next(error);
    }
};
exports.addMilestone = addMilestone;
// B. Edit Milestone in Projected Sale
const updateMilestone = async (req, res, next) => {
    try {
        const saleId = req.params.id;
        const milestoneId = req.params.milestoneId;
        const parsedData = projectedSale_validator_1.singleMilestoneSchema.partial().parse(req.body);
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. User session not found.',
            });
        }
        const milestone = await projectedSale_service_1.ProjectedSaleService.updateMilestone(saleId, milestoneId, parsedData, userId);
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
    }
    catch (error) {
        next(error);
    }
};
exports.updateMilestone = updateMilestone;
// C. Delete Milestone from Projected Sale
const deleteMilestone = async (req, res, next) => {
    try {
        const saleId = req.params.id;
        const milestoneId = req.params.milestoneId;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. User session not found.',
            });
        }
        const result = await projectedSale_service_1.ProjectedSaleService.deleteMilestone(saleId, milestoneId, userId);
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
    }
    catch (error) {
        next(error);
    }
};
exports.deleteMilestone = deleteMilestone;
