import { Request, Response, NextFunction } from 'express';
import { VendorService } from '../services/vendor.service';
import { vendorSchema } from '../validators/vendor.validator';
import { VendorStatus } from '@prisma/client';
import fs from 'fs';
import path from 'path';  

// 1. Get all vendors
export const getVendors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, active, vendorType, page, limit, startDate, endDate } = req.query;

    const result = await VendorService.getVendors({
      search: search as string,
      active: active as string,
      vendorType: vendorType as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    res.json({
      success: true,
      message: 'Vendors retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get vendor by ID
export const getVendorById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const vendor = await VendorService.getVendorById(id);

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
  } catch (error) {
    next(error);
  }
};

// 3. Create a new vendor
export const createVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = vendorSchema.parse(req.body);
    const vendor = await VendorService.createVendor(validatedData);

    res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update vendor
export const updateVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const validatedData = vendorSchema.parse(req.body);

    const vendor = await VendorService.updateVendor(id, validatedData);

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
  } catch (error) {
    next(error);
  }
};

// 5. Update vendor status
export const updateVendorStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!status || !Object.values(VendorStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    const vendor = await VendorService.updateVendorStatus(id, status as VendorStatus);

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
  } catch (error) {
    next(error);
  }
};

// 6. Dual Delete Strategy
export const deleteVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const isHardDelete = req.query.hard === 'true';

    const result = await VendorService.deleteVendor(id, isHardDelete);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    if (result.type === 'HARD' && result.files) {
      // Physically delete all document and logo files from the local storage
      for (const filePath of result.files) {
        const absolutePath = path.join(process.cwd(), filePath.replace(/^\//, ''));
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
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
  } catch (error) {
    next(error);
  }
};

// 7. Logo Upload Uploader
export const uploadVendorLogo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No logo file uploaded',
      });
    }

    const storedPath = `/uploads/vendors/${file.filename}`;
    const result = await VendorService.updateLogo(id, storedPath);

    if (!result) {
      // Cleanup the uploaded logo from disk immediately since vendor wasn't found
      const fileToDelete = path.join(process.cwd(), 'uploads/vendors', file.filename);
      if (fs.existsSync(fileToDelete)) {
        fs.unlinkSync(fileToDelete);
      }
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Replace old logo physically if it existed
    if (result.oldLogo) {
      const oldLogoPath = path.join(process.cwd(), result.oldLogo.replace(/^\//, ''));
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    res.json({
      success: true,
      message: 'Vendor logo uploaded successfully',
      data: result.updatedVendor,
    });
  } catch (error) {
    next(error);
  }
};

// 8. Documents Upload Uploader (Concurrently resolves matching index types)
export const uploadVendorDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const remarks = req.body.remarks as string | undefined;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
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
      // Clean up uploaded files immediately
      for (const file of files) {
        const fileToDelete = path.join(process.cwd(), 'uploads/vendors', file.filename);
        if (fs.existsSync(fileToDelete)) {
          fs.unlinkSync(fileToDelete);
        }
      }
      return res.status(400).json({
        success: false,
        message: 'Document type is required',
      });
    }

    const documents = await VendorService.addDocuments(id, files, rawTypes, remarks);

    if (!documents) {
      // Clean up uploaded files since vendor was not found
      for (const file of files) {
        const fileToDelete = path.join(process.cwd(), 'uploads/vendors', file.filename);
        if (fs.existsSync(fileToDelete)) {
          fs.unlinkSync(fileToDelete);
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
  } catch (error) {
    next(error);
  }
};

// 9. Get Vendor Documents
export const getVendorDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const documents = await VendorService.getVendorDocuments(id);

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
  } catch (error) {
    next(error);
  }
};

// 10. Get Vendor Documents By Type
export const getVendorDocumentsByType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const type = req.params.type as string;
    const documents = await VendorService.getVendorDocumentsByType(id, type);

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
  } catch (error) {
    next(error);
  }
};

// 11. Remove Vendor Document
export const removeVendorDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = req.params.documentId as string;
    const document = await VendorService.removeDocument(documentId);

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
  } catch (error) {
    next(error);
  }
};

// 12. Mark Vendor Document As Latest
export const markVendorDocumentAsLatest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = req.params.documentId as string;
    const document = await VendorService.markDocumentAsLatest(documentId);

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
  } catch (error) {
    next(error);
  }
};

// 13. Get active vendors dropdown list
export const getVendorDropdown = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendors = await VendorService.getVendorDropdown();
    res.json({
      success: true,
      message: 'Vendor dropdown retrieved successfully',
      data: vendors,
    });
  } catch (error) {
    next(error);
  }
};
