import { prisma } from '../db';
import { VendorStatus, VendorType, Prisma } from '@prisma/client';

export interface VendorFilterOptions {
  search?: string;
  active?: string;
  vendorType?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export class VendorService {
  // 1. Get all vendors (excluding soft-deleted ones)
  static async getVendors(options: VendorFilterOptions) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

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
      where.status = VendorStatus.ACTIVE;
    } else if (options.active === 'false') {
      where.status = VendorStatus.INACTIVE;
    }

    // Vendor Type filter
    if (options.vendorType === 'INDIVIDUAL') {
      where.vendorType = VendorType.INDIVIDUAL;
    } else if (options.vendorType === 'COMPANY') {
      where.vendorType = VendorType.COMPANY;
    }

    // Apply date range filters
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = new Date(options.startDate);
      }
      if (options.endDate) {
        const end = new Date(options.endDate);
        if (options.endDate.length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        where.createdAt.lte = end;
      }
    }

    // Fetch list and total count
    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.vendor.count({ where }),
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
  static async getVendorById(id: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id, deletedAt: null },
      include: {
        documents: {
          where: { deletedAt: null },
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    if (!vendor) return null;

    const { documents, ...vendorData } = vendor;

    // Group active documents by type
    const groupedDocuments = documents.reduce((acc, doc) => {
      if (!acc[doc.documentType]) {
        acc[doc.documentType] = [];
      }
      acc[doc.documentType].push(doc);
      return acc;
    }, {} as Record<string, typeof documents>);

    return {
      ...vendorData,
      documents: groupedDocuments,
    };
  }

  // 3. Create a new vendor
  static async createVendor(data: any) {
    // If INDIVIDUAL, set companyName to null
    const companyName = data.vendorType === 'INDIVIDUAL' ? null : data.companyName;

    return prisma.vendor.create({
      data: {
        ...data,
        companyName,
        ccEmails: data.ccEmails || [],
        status: data.status || VendorStatus.ACTIVE,
        gstApplicable: data.gstApplicable ?? false,
        tdsApplicable: data.tdsApplicable ?? false,
        tdsPercentage: data.tdsPercentage ? new Prisma.Decimal(data.tdsPercentage) : null,
      },
    });
  }

  // 4. Update vendor
  static async updateVendor(id: string, data: any) {
    const vendorExists = await prisma.vendor.findUnique({ where: { id, deletedAt: null } });
    if (!vendorExists) return null;

    // If INDIVIDUAL, set companyName to null
    const companyName = data.vendorType === 'INDIVIDUAL' ? null : data.companyName;

    return prisma.vendor.update({
      where: { id },
      data: {
        ...data,
        companyName,
        ccEmails: data.ccEmails || [],
        gstApplicable: data.gstApplicable ?? false,
        tdsApplicable: data.tdsApplicable ?? false,
        tdsPercentage: data.tdsPercentage ? new Prisma.Decimal(data.tdsPercentage) : null,
      },
    });
  }

  // 5. Update Status
  static async updateVendorStatus(id: string, status: VendorStatus) {
    const vendorExists = await prisma.vendor.findUnique({ where: { id, deletedAt: null } });
    if (!vendorExists) return null;

    return prisma.vendor.update({
      where: { id },
      data: { status },
    });
  }

  // 6. Dual Delete Strategy (Returns list of files if hard delete is executed, so controller can clean them)
  static async deleteVendor(id: string, hard: boolean) {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: { documents: { where: { deletedAt: null } } },
    });

    if (!vendor) return null;

    if (hard) {
      const filesToDelete = vendor.documents.map((doc) => doc.storedFileName);
      if (vendor.clientLogo) {
        filesToDelete.push(vendor.clientLogo);
      }

      // Execute transaction to delete from DB
      await prisma.$transaction([
        prisma.vendorDocument.deleteMany({ where: { vendorId: id } }),
        prisma.vendor.delete({ where: { id } }),
      ]);

      return { type: 'HARD', files: filesToDelete };
    } else {
      // Soft Delete
      await prisma.vendor.update({
        where: { id },
        data: { deletedAt: new Date(), status: VendorStatus.INACTIVE },
      });

      return { type: 'SOFT' };
    }
  }

  // 7. Update Vendor Logo
  static async updateLogo(id: string, storedFileName: string) {
    const vendor = await prisma.vendor.findUnique({ where: { id, deletedAt: null } });
    if (!vendor) return null;

    const oldLogo = vendor.clientLogo;

    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: { clientLogo: storedFileName },
    });

    return { updatedVendor, oldLogo };
  }

  // 8. Add Vendor Documents
  static async addDocuments(id: string, files: Express.Multer.File[], documentTypes: string[], remarks?: string) {
    const vendorExists = await prisma.vendor.findUnique({ where: { id, deletedAt: null } });
    if (!vendorExists) return null;

    const documentPromises = files.map(async (file, index) => {
      const currentDocType = documentTypes[index] || documentTypes[0] || 'Other Documents';

      // 1. Get current highest version for this document type
      const latestDoc = await prisma.vendorDocument.findFirst({
        where: { vendorId: id, documentType: currentDocType, deletedAt: null },
        orderBy: { versionNumber: 'desc' },
      });

      const nextVersion = (latestDoc ? latestDoc.versionNumber : 0) + 1;

      // 2. Mark existing latest for this specific type as not latest
      await prisma.vendorDocument.updateMany({
        where: { vendorId: id, documentType: currentDocType, isLatest: true },
        data: { isLatest: false },
      });

      // 3. Create new document version record
      return prisma.vendorDocument.create({
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
  static async getVendorDocuments(vendorId: string) {
    const vendorExists = await prisma.vendor.findUnique({ where: { id: vendorId, deletedAt: null } });
    if (!vendorExists) return null;

    const documents = await prisma.vendorDocument.findMany({
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
    }, {} as Record<string, typeof documents>);
  }

  // 10. Get Vendor Documents By Type
  static async getVendorDocumentsByType(vendorId: string, documentType: string) {
    const vendorExists = await prisma.vendor.findUnique({ where: { id: vendorId, deletedAt: null } });
    if (!vendorExists) return null;

    return prisma.vendorDocument.findMany({
      where: { vendorId, documentType, deletedAt: null },
      orderBy: { versionNumber: 'desc' },
    });
  }

  // 11. Soft delete document and reassign latest flag
  static async removeDocument(documentId: string) {
    const document = await prisma.vendorDocument.findUnique({
      where: { id: documentId, deletedAt: null },
    });

    if (!document) return null;

    // Soft delete document
    await prisma.vendorDocument.update({
      where: { id: documentId },
      data: { deletedAt: new Date(), isLatest: false },
    });

    // If it was the latest, reassign the latest flag to the previous version
    if (document.isLatest) {
      const previousLatest = await prisma.vendorDocument.findFirst({
        where: {
          vendorId: document.vendorId,
          documentType: document.documentType,
          deletedAt: null,
        },
        orderBy: { versionNumber: 'desc' },
      });

      if (previousLatest) {
        await prisma.vendorDocument.update({
          where: { id: previousLatest.id },
          data: { isLatest: true },
        });
      }
    }

    return document;
  }

  // 12. Mark a vendor document as latest
  static async markDocumentAsLatest(documentId: string) {
    const document = await prisma.vendorDocument.findUnique({
      where: { id: documentId, deletedAt: null },
    });

    if (!document) return null;

    if (document.isLatest) return document;

    // Unmark the current latest for this type
    await prisma.vendorDocument.updateMany({
      where: { vendorId: document.vendorId, documentType: document.documentType, isLatest: true },
      data: { isLatest: false }
    });

    // Mark the selected one as latest
    return prisma.vendorDocument.update({
      where: { id: documentId },
      data: { isLatest: true }
    });
  }

  // 13. Get Vendor Dropdown list (returns only id, vendorName, and companyName)
  static async getVendorDropdown() {
    return prisma.vendor.findMany({
      where: {
        status: VendorStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        vendorName: true,
        companyName: true,
      },
      orderBy: {
        vendorName: 'asc',
      },
    });
  }

  // 14. Bulk create vendors inside a database transaction
  static async bulkCreateVendors(vendorsList: any[]) {
    return prisma.$transaction(
      vendorsList.map((vendor) => {
        const companyName = vendor.vendorType === 'INDIVIDUAL' ? null : vendor.companyName;
        return prisma.vendor.create({
          data: {
            vendorType: vendor.vendorType,
            vendorName: vendor.vendorName,
            companyName,
            phoneNumber: vendor.phoneNumber,
            email: vendor.email,
            ccEmails: vendor.ccEmails || [],
            status: vendor.status || VendorStatus.ACTIVE,
            gstApplicable: vendor.gstApplicable ?? false,
            gstinNumber: vendor.gstinNumber || null,
            verifiedGstinName: vendor.verifiedGstinName || null,
            panNumber: vendor.panNumber || null,
            panName: vendor.panName || null,
            tdsApplicable: vendor.tdsApplicable ?? false,
            tdsSection: vendor.tdsSection || null,
            tdsPercentage: vendor.tdsPercentage ? new Prisma.Decimal(vendor.tdsPercentage) : null,
            addressLine1: vendor.addressLine1,
            addressLine2: vendor.addressLine2 || null,
            country: vendor.country || 'India',
            state: vendor.state,
            city: vendor.city,
            pincode: vendor.pincode,
            bankAccountHolderName: vendor.bankAccountHolderName || null,
            bankName: vendor.bankName || null,
            bankAccountNumber: vendor.bankAccountNumber || null,
            bankIfscCode: vendor.bankIfscCode || null,
            bankSwiftCode: vendor.bankSwiftCode || null,
            bankBranchName: vendor.bankBranchName || null,
          },
        });
      })
    );
  }
}
