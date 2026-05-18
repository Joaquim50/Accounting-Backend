"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorService = void 0;
const db_1 = require("../db");
const client_1 = require("@prisma/client");
class VendorService {
    // 1. Get all vendors (excluding soft-deleted ones)
    static async getVendors(options) {
        const page = options.page || 1;
        const limit = options.limit || 10;
        const skip = (page - 1) * limit;
        const where = { deletedAt: null };
        // Search query matches vendorName, companyName, or email
        if (options.search) {
            where.OR = [
                { vendorName: { contains: options.search, mode: 'insensitive' } },
                { companyName: { contains: options.search, mode: 'insensitive' } },
                { email: { contains: options.search, mode: 'insensitive' } },
            ];
        }
        // Status filter
        if (options.active === 'true') {
            where.status = client_1.VendorStatus.ACTIVE;
        }
        else if (options.active === 'false') {
            where.status = client_1.VendorStatus.INACTIVE;
        }
        // Vendor Type filter
        if (options.vendorType === 'INDIVIDUAL') {
            where.vendorType = client_1.VendorType.INDIVIDUAL;
        }
        else if (options.vendorType === 'COMPANY') {
            where.vendorType = client_1.VendorType.COMPANY;
        }
        // Fetch list and total count
        const [vendors, total] = await Promise.all([
            db_1.prisma.vendor.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            db_1.prisma.vendor.count({ where }),
        ]);
        return {
            vendors,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    // 2. Get single vendor details with grouped active documents
    static async getVendorById(id) {
        const vendor = await db_1.prisma.vendor.findUnique({
            where: { id, deletedAt: null },
            include: {
                documents: {
                    where: { deletedAt: null },
                    orderBy: { versionNumber: 'desc' },
                },
            },
        });
        if (!vendor)
            return null;
        const { documents, ...vendorData } = vendor;
        // Group active documents by type
        const groupedDocuments = documents.reduce((acc, doc) => {
            if (!acc[doc.documentType]) {
                acc[doc.documentType] = [];
            }
            acc[doc.documentType].push(doc);
            return acc;
        }, {});
        return {
            ...vendorData,
            documents: groupedDocuments,
        };
    }
    // 3. Create a new vendor
    static async createVendor(data) {
        // If INDIVIDUAL, set companyName to null
        const companyName = data.vendorType === 'INDIVIDUAL' ? null : data.companyName;
        return db_1.prisma.vendor.create({
            data: {
                ...data,
                companyName,
                ccEmails: data.ccEmails || [],
                status: data.status || client_1.VendorStatus.ACTIVE,
                gstApplicable: data.gstApplicable ?? false,
                tdsApplicable: data.tdsApplicable ?? false,
                tdsPercentage: data.tdsPercentage ? new client_1.Prisma.Decimal(data.tdsPercentage) : null,
            },
        });
    }
    // 4. Update vendor
    static async updateVendor(id, data) {
        const vendorExists = await db_1.prisma.vendor.findUnique({ where: { id, deletedAt: null } });
        if (!vendorExists)
            return null;
        // If INDIVIDUAL, set companyName to null
        const companyName = data.vendorType === 'INDIVIDUAL' ? null : data.companyName;
        return db_1.prisma.vendor.update({
            where: { id },
            data: {
                ...data,
                companyName,
                ccEmails: data.ccEmails || [],
                gstApplicable: data.gstApplicable ?? false,
                tdsApplicable: data.tdsApplicable ?? false,
                tdsPercentage: data.tdsPercentage ? new client_1.Prisma.Decimal(data.tdsPercentage) : null,
            },
        });
    }
    // 5. Update Status
    static async updateVendorStatus(id, status) {
        const vendorExists = await db_1.prisma.vendor.findUnique({ where: { id, deletedAt: null } });
        if (!vendorExists)
            return null;
        return db_1.prisma.vendor.update({
            where: { id },
            data: { status },
        });
    }
    // 6. Dual Delete Strategy (Returns list of files if hard delete is executed, so controller can clean them)
    static async deleteVendor(id, hard) {
        const vendor = await db_1.prisma.vendor.findUnique({
            where: { id },
            include: { documents: { where: { deletedAt: null } } },
        });
        if (!vendor)
            return null;
        if (hard) {
            const filesToDelete = vendor.documents.map((doc) => doc.storedFileName);
            if (vendor.clientLogo) {
                filesToDelete.push(vendor.clientLogo);
            }
            // Execute transaction to delete from DB
            await db_1.prisma.$transaction([
                db_1.prisma.vendorDocument.deleteMany({ where: { vendorId: id } }),
                db_1.prisma.vendor.delete({ where: { id } }),
            ]);
            return { type: 'HARD', files: filesToDelete };
        }
        else {
            // Soft Delete
            await db_1.prisma.vendor.update({
                where: { id },
                data: { deletedAt: new Date(), status: client_1.VendorStatus.INACTIVE },
            });
            return { type: 'SOFT' };
        }
    }
    // 7. Update Vendor Logo
    static async updateLogo(id, storedFileName) {
        const vendor = await db_1.prisma.vendor.findUnique({ where: { id, deletedAt: null } });
        if (!vendor)
            return null;
        const oldLogo = vendor.clientLogo;
        const updatedVendor = await db_1.prisma.vendor.update({
            where: { id },
            data: { clientLogo: storedFileName },
        });
        return { updatedVendor, oldLogo };
    }
    // 8. Add Vendor Documents
    static async addDocuments(id, files, documentTypes, remarks) {
        const vendorExists = await db_1.prisma.vendor.findUnique({ where: { id, deletedAt: null } });
        if (!vendorExists)
            return null;
        const documentPromises = files.map(async (file, index) => {
            const currentDocType = documentTypes[index] || documentTypes[0] || 'Other Documents';
            // 1. Get current highest version for this document type
            const latestDoc = await db_1.prisma.vendorDocument.findFirst({
                where: { vendorId: id, documentType: currentDocType, deletedAt: null },
                orderBy: { versionNumber: 'desc' },
            });
            const nextVersion = (latestDoc ? latestDoc.versionNumber : 0) + 1;
            // 2. Mark existing latest for this specific type as not latest
            await db_1.prisma.vendorDocument.updateMany({
                where: { vendorId: id, documentType: currentDocType, isLatest: true },
                data: { isLatest: false },
            });
            // 3. Create new document version record
            return db_1.prisma.vendorDocument.create({
                data: {
                    vendorId: id,
                    documentType: currentDocType,
                    originalFileName: file.originalname,
                    storedFileName: `/uploads/vendors/${file.filename}`,
                    mimeType: file.mimetype,
                    fileSize: file.size,
                    versionNumber: nextVersion,
                    isLatest: true,
                    remarks: remarks || null,
                },
            });
        });
        return Promise.all(documentPromises);
    }
    // 9. Get Vendor Documents
    static async getVendorDocuments(vendorId) {
        const vendorExists = await db_1.prisma.vendor.findUnique({ where: { id: vendorId, deletedAt: null } });
        if (!vendorExists)
            return null;
        const documents = await db_1.prisma.vendorDocument.findMany({
            where: { vendorId, deletedAt: null },
            orderBy: { versionNumber: 'desc' },
        });
        // Group documents by type
        return documents.reduce((acc, doc) => {
            if (!acc[doc.documentType]) {
                acc[doc.documentType] = [];
            }
            acc[doc.documentType].push(doc);
            return acc;
        }, {});
    }
    // 10. Get Vendor Documents By Type
    static async getVendorDocumentsByType(vendorId, documentType) {
        const vendorExists = await db_1.prisma.vendor.findUnique({ where: { id: vendorId, deletedAt: null } });
        if (!vendorExists)
            return null;
        return db_1.prisma.vendorDocument.findMany({
            where: { vendorId, documentType, deletedAt: null },
            orderBy: { versionNumber: 'desc' },
        });
    }
    // 11. Soft delete document and reassign latest flag
    static async removeDocument(documentId) {
        const document = await db_1.prisma.vendorDocument.findUnique({
            where: { id: documentId, deletedAt: null },
        });
        if (!document)
            return null;
        // Soft delete document
        await db_1.prisma.vendorDocument.update({
            where: { id: documentId },
            data: { deletedAt: new Date(), isLatest: false },
        });
        // If it was the latest, reassign the latest flag to the previous version
        if (document.isLatest) {
            const previousLatest = await db_1.prisma.vendorDocument.findFirst({
                where: {
                    vendorId: document.vendorId,
                    documentType: document.documentType,
                    deletedAt: null,
                },
                orderBy: { versionNumber: 'desc' },
            });
            if (previousLatest) {
                await db_1.prisma.vendorDocument.update({
                    where: { id: previousLatest.id },
                    data: { isLatest: true },
                });
            }
        }
        return document;
    }
    // 12. Mark a vendor document as latest
    static async markDocumentAsLatest(documentId) {
        const document = await db_1.prisma.vendorDocument.findUnique({
            where: { id: documentId, deletedAt: null },
        });
        if (!document)
            return null;
        if (document.isLatest)
            return document;
        // Unmark the current latest for this type
        await db_1.prisma.vendorDocument.updateMany({
            where: { vendorId: document.vendorId, documentType: document.documentType, isLatest: true },
            data: { isLatest: false }
        });
        // Mark the selected one as latest
        return db_1.prisma.vendorDocument.update({
            where: { id: documentId },
            data: { isLatest: true }
        });
    }
}
exports.VendorService = VendorService;
