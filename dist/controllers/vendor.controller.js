"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVendorDropdown = exports.markVendorDocumentAsLatest = exports.removeVendorDocument = exports.getVendorDocumentsByType = exports.getVendorDocuments = exports.uploadVendorDocuments = exports.uploadVendorLogo = exports.deleteVendor = exports.updateVendorStatus = exports.updateVendor = exports.createVendor = exports.getVendorById = exports.getVendors = void 0;
const vendor_service_1 = require("../services/vendor.service");
const vendor_validator_1 = require("../validators/vendor.validator");
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// 1. Get all vendors
const getVendors = async (req, res, next) => {
    try {
        const { search, active, vendorType, page, limit, startDate, endDate } = req.query;
        const result = await vendor_service_1.VendorService.getVendors({
            search: search,
            active: active,
            vendorType: vendorType,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 10,
            startDate: startDate,
            endDate: endDate,
        });
        res.json({
            success: true,
            message: 'Vendors retrieved successfully',
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getVendors = getVendors;
// 2. Get vendor by ID
const getVendorById = async (req, res, next) => {
    try {
        const id = req.params.id;
        const vendor = await vendor_service_1.VendorService.getVendorById(id);
        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found',
            });
        }
        res.json({
            success: true,
            message: 'Vendor retrieved successfully',
            data: vendor,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getVendorById = getVendorById;
// 3. Create a new vendor
const createVendor = async (req, res, next) => {
    try {
        const validatedData = vendor_validator_1.vendorSchema.parse(req.body);
        const vendor = await vendor_service_1.VendorService.createVendor(validatedData);
        res.status(201).json({
            success: true,
            message: 'Vendor created successfully',
            data: vendor,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createVendor = createVendor;
// 4. Update vendor
const updateVendor = async (req, res, next) => {
    try {
        const id = req.params.id;
        const validatedData = vendor_validator_1.vendorSchema.parse(req.body);
        const vendor = await vendor_service_1.VendorService.updateVendor(id, validatedData);
        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found',
            });
        }
        res.json({
            success: true,
            message: 'Vendor updated successfully',
            data: vendor,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateVendor = updateVendor;
// 5. Update vendor status
const updateVendorStatus = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { status } = req.body;
        if (!status || !Object.values(client_1.VendorStatus).includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value',
            });
        }
        const vendor = await vendor_service_1.VendorService.updateVendorStatus(id, status);
        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found',
            });
        }
        res.json({
            success: true,
            message: 'Vendor status updated successfully',
            data: vendor,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateVendorStatus = updateVendorStatus;
// 6. Dual Delete Strategy
const deleteVendor = async (req, res, next) => {
    try {
        const id = req.params.id;
        const isHardDelete = req.query.hard === 'true';
        const result = await vendor_service_1.VendorService.deleteVendor(id, isHardDelete);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found',
            });
        }
        if (result.type === 'HARD' && result.files) {
            // Physically delete all document and logo files from the local storage
            for (const filePath of result.files) {
                const absolutePath = path_1.default.join(process.cwd(), filePath.replace(/^\//, ''));
                if (fs_1.default.existsSync(absolutePath)) {
                    fs_1.default.unlinkSync(absolutePath);
                }
            }
            return res.json({
                success: true,
                message: 'Vendor and all associated files permanently deleted',
            });
        }
        res.json({
            success: true,
            message: 'Vendor soft deleted successfully',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteVendor = deleteVendor;
// 7. Logo Upload Uploader
const uploadVendorLogo = async (req, res, next) => {
    try {
        const id = req.params.id;
        const file = req.file;
        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No logo file uploaded',
            });
        }
        const storedPath = `/uploads/vendors/${file.filename}`;
        const result = await vendor_service_1.VendorService.updateLogo(id, storedPath);
        if (!result) {
            // Cleanup the uploaded logo from disk immediately since vendor wasn't found
            const fileToDelete = path_1.default.join(process.cwd(), 'uploads/vendors', file.filename);
            if (fs_1.default.existsSync(fileToDelete)) {
                fs_1.default.unlinkSync(fileToDelete);
            }
            return res.status(404).json({
                success: false,
                message: 'Vendor not found',
            });
        }
        // Replace old logo physically if it existed
        if (result.oldLogo) {
            const oldLogoPath = path_1.default.join(process.cwd(), result.oldLogo.replace(/^\//, ''));
            if (fs_1.default.existsSync(oldLogoPath)) {
                fs_1.default.unlinkSync(oldLogoPath);
            }
        }
        res.json({
            success: true,
            message: 'Vendor logo uploaded successfully',
            data: result.updatedVendor,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.uploadVendorLogo = uploadVendorLogo;
// 8. Documents Upload Uploader (Concurrently resolves matching index types)
const uploadVendorDocuments = async (req, res, next) => {
    try {
        const id = req.params.id;
        const remarks = req.body.remarks;
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded',
            });
        }
        // Build consolidated array of document types from both possible key fields
        const rawTypes = [];
        if (req.body.documentType) {
            if (Array.isArray(req.body.documentType)) {
                rawTypes.push(...req.body.documentType);
            }
            else {
                rawTypes.push(req.body.documentType);
            }
        }
        if (req.body.documentTypes) {
            if (Array.isArray(req.body.documentTypes)) {
                rawTypes.push(...req.body.documentTypes);
            }
            else {
                rawTypes.push(req.body.documentTypes);
            }
        }
        if (rawTypes.length === 0) {
            // Clean up uploaded files immediately
            for (const file of files) {
                const fileToDelete = path_1.default.join(process.cwd(), 'uploads/vendors', file.filename);
                if (fs_1.default.existsSync(fileToDelete)) {
                    fs_1.default.unlinkSync(fileToDelete);
                }
            }
            return res.status(400).json({
                success: false,
                message: 'Document type is required',
            });
        }
        const documents = await vendor_service_1.VendorService.addDocuments(id, files, rawTypes, remarks);
        if (!documents) {
            // Clean up uploaded files since vendor was not found
            for (const file of files) {
                const fileToDelete = path_1.default.join(process.cwd(), 'uploads/vendors', file.filename);
                if (fs_1.default.existsSync(fileToDelete)) {
                    fs_1.default.unlinkSync(fileToDelete);
                }
            }
            return res.status(404).json({
                success: false,
                message: 'Vendor not found',
            });
        }
        res.json({
            success: true,
            message: 'Documents uploaded successfully',
            data: documents,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.uploadVendorDocuments = uploadVendorDocuments;
// 9. Get Vendor Documents
const getVendorDocuments = async (req, res, next) => {
    try {
        const id = req.params.id;
        const documents = await vendor_service_1.VendorService.getVendorDocuments(id);
        if (!documents) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found',
            });
        }
        res.json({
            success: true,
            message: 'Documents retrieved successfully',
            data: documents,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getVendorDocuments = getVendorDocuments;
// 10. Get Vendor Documents By Type
const getVendorDocumentsByType = async (req, res, next) => {
    try {
        const id = req.params.id;
        const type = req.params.type;
        const documents = await vendor_service_1.VendorService.getVendorDocumentsByType(id, type);
        if (!documents) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found',
            });
        }
        res.json({
            success: true,
            message: 'Documents retrieved successfully',
            data: documents,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getVendorDocumentsByType = getVendorDocumentsByType;
// 11. Remove Vendor Document
const removeVendorDocument = async (req, res, next) => {
    try {
        const documentId = req.params.documentId;
        const document = await vendor_service_1.VendorService.removeDocument(documentId);
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found',
            });
        }
        res.json({
            success: true,
            message: 'Document removed successfully',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.removeVendorDocument = removeVendorDocument;
// 12. Mark Vendor Document As Latest
const markVendorDocumentAsLatest = async (req, res, next) => {
    try {
        const documentId = req.params.documentId;
        const document = await vendor_service_1.VendorService.markDocumentAsLatest(documentId);
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found',
            });
        }
        res.json({
            success: true,
            message: 'Document marked as latest successfully',
            data: document,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.markVendorDocumentAsLatest = markVendorDocumentAsLatest;
// 13. Get active vendors dropdown list
const getVendorDropdown = async (req, res, next) => {
    try {
        const vendors = await vendor_service_1.VendorService.getVendorDropdown();
        res.json({
            success: true,
            message: 'Vendor dropdown retrieved successfully',
            data: vendors,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getVendorDropdown = getVendorDropdown;
