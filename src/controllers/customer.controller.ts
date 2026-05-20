import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { customerSchema, bulkCreateCustomerSchema } from '../validators/customer.validator';
import fs from 'fs';
import path from 'path';

// Get all customers (with pagination, search, and filtering)
export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, active, page = 1, limit = 10, startDate, endDate } = req.query;
    
    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { companyName: { contains: search as string, mode: 'insensitive' } },
        { contactPerson: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (active) {
      where.status = active === 'true' ? 'ACTIVE' : 'INACTIVE';
    }

    // Apply date range filters
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        if ((endDate as string).length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        where.createdAt.lte = end;
      }
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          total,
          page: pageNumber,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const customer = await prisma.customer.findUnique({
      where: { id, deletedAt: null },
      include: { 
        documents: { 
          where: { deletedAt: null },
          orderBy: { versionNumber: 'desc' }
        } 
      }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const { documents, ...customerData } = customer;
    const groupedDocuments = documents.reduce((acc, doc) => {
      if (!acc[doc.documentType]) {
        acc[doc.documentType] = [];
      }
      acc[doc.documentType].push(doc);
      return acc;
    }, {} as Record<string, typeof documents>);

    res.json({ 
      success: true, 
      data: {
        ...customerData,
        documents: groupedDocuments
      } 
    });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = customerSchema.parse(req.body);

    const customer = await prisma.customer.create({
      data: {
        ...validatedData,
        ccEmails: validatedData.ccEmails || [],
        status: validatedData.status || 'ACTIVE',
        gstApplicable: validatedData.gstApplicable ?? false,
        tdsApplicable: validatedData.tdsApplicable ?? false,
        panNumber: validatedData.panNumber || null,
      }
    });

    res.status(201).json({ success: true, message: 'Customer created successfully', data: customer });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const validatedData = customerSchema.partial().parse(req.body);

    const customerExists = await prisma.customer.findUnique({ where: { id } });
    if (!customerExists) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const dataToUpdate: any = {
      ...validatedData,
      panNumber: validatedData.panNumber === '' ? null : validatedData.panNumber,
    };

    if (validatedData.status === 'ACTIVE') {
      dataToUpdate.deletedAt = null;
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: dataToUpdate
    });

    res.json({ success: true, message: 'Customer updated successfully', data: customer });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const isHardDelete = req.query.hard === 'true';
    
    const customer = await prisma.customer.findUnique({ 
      where: { id },
      include: { documents: { where: { deletedAt: null } } }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (isHardDelete) {
      // Delete document files from storage folder
      for (const doc of customer.documents) {
        const absolutePath = path.join(process.cwd(), doc.storedFileName.replace(/^\//, ''));
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      }
      // Delete logo file from storage folder
      if (customer.clientLogo) {
        const absoluteLogoPath = path.join(process.cwd(), customer.clientLogo.replace(/^\//, ''));
        if (fs.existsSync(absoluteLogoPath)) {
          fs.unlinkSync(absoluteLogoPath);
        }
      }
      // Hard delete from database
      await prisma.customer.delete({ where: { id } });

      return res.json({ success: true, message: 'Customer and all associated files permanently deleted' });
    } else {
      // Safe Soft Delete
      await prisma.customer.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'INACTIVE' }
      });

      return res.json({ success: true, message: 'Customer soft deleted successfully' });
    }
  } catch (error) {
    next(error);
  }
};

// Document Upload
export const uploadDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const remarks = req.body.remarks as string | undefined;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    // Build consolidated array of document types from both possible key fields
    const rawTypes: string[] = [];
    if (req.body.documentType) {
      if (Array.isArray(req.body.documentType)) {
        rawTypes.push(...req.body.documentType);
      } else {
        rawTypes.push(req.body.documentType);
      }
    }
    if (req.body.documentTypes) {
      if (Array.isArray(req.body.documentTypes)) {
        rawTypes.push(...req.body.documentTypes);
      } else {
        rawTypes.push(req.body.documentTypes);
      }
    }

    if (rawTypes.length === 0) {
      return res.status(400).json({ success: false, message: 'Document type is required' });
    }

    const customerExists = await prisma.customer.findUnique({ where: { id, deletedAt: null } });
    if (!customerExists) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const userId = req.user?.id; // from auth middleware

    // Create new documents resolving independent versions and marking isLatest correctly for each type
    const documentPromises = files.map(async (file, index) => {
      // Pair each file with its respective document type, fallback to first one or 'Other'
      const currentDocType = rawTypes[index] || rawTypes[0] || 'Other';

      // 1. Get current highest version for this document type
      const latestDoc = await prisma.customerDocument.findFirst({
        where: { customerId: id, documentType: currentDocType, deletedAt: null },
        orderBy: { versionNumber: 'desc' },
      });

      const nextVersion = (latestDoc ? latestDoc.versionNumber : 0) + 1;

      // 2. Mark existing latest for this specific document type as not latest
      await prisma.customerDocument.updateMany({
        where: { customerId: id, documentType: currentDocType, isLatest: true },
        data: { isLatest: false }
      });

      // 3. Create new document
      return prisma.customerDocument.create({
        data: {
          customerId: id,
          documentType: currentDocType,
          originalFileName: file.originalname,
          storedFileName: `/uploads/customers/${file.filename}`,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedBy: userId,
          versionNumber: nextVersion,
          isLatest: true,
          remarks
        }
      });
    });

    const documents = await Promise.all(documentPromises);

    res.json({ success: true, message: 'Documents uploaded successfully', data: documents });
  } catch (error) {
    next(error);
  }
};

export const getCustomerDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const documents = await prisma.customerDocument.findMany({
      where: { customerId: id, deletedAt: null },
      orderBy: { uploadedAt: 'desc' }
    });

    // Group documents by documentType
    const grouped = documents.reduce((acc, doc) => {
      if (!acc[doc.documentType]) {
        acc[doc.documentType] = [];
      }
      acc[doc.documentType].push(doc);
      return acc;
    }, {} as Record<string, typeof documents>);

    res.json({ success: true, data: grouped });
  } catch (error) {
    next(error);
  }
};

export const getCustomerDocumentsByType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const type = req.params.type as string;

    const documents = await prisma.customerDocument.findMany({
      where: { customerId: id, documentType: type, deletedAt: null },
      orderBy: { versionNumber: 'desc' }
    });

    res.json({ success: true, data: documents });
  } catch (error) {
    next(error);
  }
};

export const removeDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = req.params.documentId as string;

    const document = await prisma.customerDocument.findUnique({ where: { id: documentId, deletedAt: null } });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Soft delete
    await prisma.customerDocument.update({
      where: { id: documentId },
      data: { deletedAt: new Date(), isLatest: false }
    });

    // If it was latest, make the previous highest version the new latest
    if (document.isLatest) {
      const previousLatest = await prisma.customerDocument.findFirst({
        where: { customerId: document.customerId, documentType: document.documentType, deletedAt: null },
        orderBy: { versionNumber: 'desc' }
      });

      if (previousLatest) {
        await prisma.customerDocument.update({
          where: { id: previousLatest.id },
          data: { isLatest: true }
        });
      }
    }

    res.json({ success: true, message: 'Document soft deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const markDocumentAsLatest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = req.params.documentId as string;

    const document = await prisma.customerDocument.findUnique({ where: { id: documentId, deletedAt: null } });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (document.isLatest) {
      return res.json({ success: true, message: 'Document is already marked as latest', data: document });
    }

    // Unmark the current latest for this type
    await prisma.customerDocument.updateMany({
      where: { customerId: document.customerId, documentType: document.documentType, isLatest: true },
      data: { isLatest: false }
    });

    // Mark the selected one as latest
    const updatedDocument = await prisma.customerDocument.update({
      where: { id: documentId },
      data: { isLatest: true }
    });

    res.json({ success: true, message: 'Document marked as latest successfully', data: updatedDocument });
  } catch (error) {
    next(error);
  }
};

// Client Logo Upload
export const uploadCustomerLogo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No logo file uploaded' });
    }

    const customerExists = await prisma.customer.findUnique({ where: { id, deletedAt: null } });
    if (!customerExists) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Update customer's clientLogo
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: { clientLogo: `/uploads/customers/${file.filename}` }
    });

    res.json({ success: true, message: 'Client logo uploaded successfully', data: updatedCustomer });
  } catch (error) {
    next(error);
  }
};

// Get customer dropdown list (returns only id, companyName and contactPerson)
export const getCustomerDropdown = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        companyName: true,
        contactPerson: true,
      },
      orderBy: {
        companyName: 'asc',
      },
    });

    res.json({
      success: true,
      message: 'Customer dropdown retrieved successfully',
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

// Bulk create customers
export const bulkCreateCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedData = bulkCreateCustomerSchema.parse(req.body);
    const { customers } = parsedData;

    // check for duplicate companyNames or emails in database
    const companyNames = customers.map(c => c.companyName);
    const emails = customers.map(c => c.email);

    const existingCustomers = await prisma.customer.findMany({
      where: {
        OR: [
          { companyName: { in: companyNames, mode: 'insensitive' } },
          { email: { in: emails, mode: 'insensitive' } }
        ],
        deletedAt: null
      }
    });

    const existingCompanyNames = new Set(existingCustomers.map(c => c.companyName.toLowerCase()));
    const existingEmails = new Set(existingCustomers.map(c => c.email.toLowerCase()));

    const duplicates: string[] = [];
    for (const customer of customers) {
      if (existingCompanyNames.has(customer.companyName.toLowerCase())) {
        duplicates.push(`Company name "${customer.companyName}" already exists in the system.`);
      }
      if (existingEmails.has(customer.email.toLowerCase())) {
        duplicates.push(`Email "${customer.email}" already exists in the system.`);
      }
    }

    // Check duplicates within the uploaded list itself
    const seenCompanyNames = new Set<string>();
    const seenEmails = new Set<string>();
    for (let i = 0; i < customers.length; i++) {
      const c = customers[i];
      const lowerName = c.companyName.toLowerCase();
      const lowerEmail = c.email.toLowerCase();
      
      if (seenCompanyNames.has(lowerName)) {
        duplicates.push(`Duplicate company name in upload list: "${c.companyName}" (row ${i + 1})`);
      }
      if (seenEmails.has(lowerEmail)) {
        duplicates.push(`Duplicate email in upload list: "${c.email}" (row ${i + 1})`);
      }
      seenCompanyNames.add(lowerName);
      seenEmails.add(lowerEmail);
    }

    if (duplicates.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed: Duplicate customer records detected.',
        errors: duplicates
      });
    }

    // Use a transaction for atomic insertion
    const createdCustomers = await prisma.$transaction(
      customers.map(customer =>
        prisma.customer.create({
          data: {
            ...customer,
            ccEmails: customer.ccEmails || [],
            status: customer.status || 'ACTIVE',
            gstApplicable: customer.gstApplicable ?? false,
            tdsApplicable: customer.tdsApplicable ?? false,
            panNumber: customer.panNumber || null,
          }
        })
      )
    );

    res.status(201).json({
      success: true,
      message: `${createdCustomers.length} customers imported successfully`,
      data: createdCustomers
    });
  } catch (error) {
    next(error);
  }
};


