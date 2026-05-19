import { prisma } from '../db';
import { Prisma, ProjectType, BillingType, ProjectedSaleStatus, MilestoneStatus, AMCBillingCycle } from '@prisma/client';

export interface ProjectedSaleFilterOptions {
  search?: string;
  customerId?: string;
  projectType?: ProjectType;
  billingType?: BillingType;
  status?: ProjectedSaleStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export class ProjectedSaleService {
  // 1. Helper to calculate GST, TDS, and final amounts
  private static calculateFinancials(data: {
    totalValue: number;
    gstPercentage?: number;
    tdsPercentage?: number;
  }) {
    const totalValue = Number(data.totalValue);
    const gstPercentage = Number(data.gstPercentage || 0);
    const tdsPercentage = Number(data.tdsPercentage || 0);

    const gstAmount = Number(((totalValue * gstPercentage) / 100).toFixed(2));
    const tdsAmount = Number(((totalValue * tdsPercentage) / 100).toFixed(2));
    const finalAmount = Number((totalValue + gstAmount - tdsAmount).toFixed(2));

    return {
      gstAmount,
      tdsAmount,
      finalAmount,
    };
  }

  // 2. Create a Projected Sale record
  static async createProjectedSale(data: any, userId: string) {
    const financials = this.calculateFinancials({
      totalValue: data.totalValue,
      gstPercentage: data.gstPercentage,
      tdsPercentage: data.tdsPercentage,
    });

    // Enforce billing type exclusive data
    const amcDuration = data.billingType === 'AMC' ? data.amcDurationMonths : null;
    const amcCycle = data.billingType === 'AMC' ? data.amcBillingCycle : null;
    const retainerAmount = data.billingType === 'MONTHLY_RETAINER' ? data.monthlyRetainerAmount : null;
    const retainerDuration = data.billingType === 'MONTHLY_RETAINER' ? data.retainerDurationMonths : null;

    return prisma.$transaction(async (tx) => {
      // Create the Projected Sale
      const projectedSale = await tx.projectedSale.create({
        data: {
          customerId: data.customerId,
          projectName: data.projectName,
          projectType: data.projectType,
          billingType: data.billingType,
          totalValue: data.totalValue,
          startDate: data.startDate,
          endDate: data.endDate,
          gstPercentage: data.gstPercentage || 0,
          tdsPercentage: data.tdsPercentage || 0,
          gstAmount: financials.gstAmount,
          tdsAmount: financials.tdsAmount,
          finalAmount: financials.finalAmount,
          status: data.status || 'LEAD',
          notes: data.notes || null,
          amcDurationMonths: amcDuration,
          amcBillingCycle: amcCycle,
          monthlyRetainerAmount: retainerAmount,
          retainerDurationMonths: retainerDuration,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      // If billing type is Milestone Based, create milestones
      if (data.billingType === 'MILESTONE_BASED' && data.milestones && data.milestones.length > 0) {
        const milestonesData = data.milestones.map((ms: any) => {
          const msPercentage = Number(ms.percentage);
          const msAmount = Number(((Number(data.totalValue) * msPercentage) / 100).toFixed(2));
          return {
            projectedSaleId: projectedSale.id,
            milestoneName: ms.milestoneName,
            percentage: msPercentage,
            amount: msAmount,
            dueDate: new Date(ms.dueDate),
            status: ms.status || 'PENDING',
          };
        });

        await tx.projectedSaleMilestone.createMany({
          data: milestonesData,
        });
      } else if (data.billingType === 'ONE_TIME') {
        // If billing type is ONE_TIME, automatically create a single 100% milestone
        await tx.projectedSaleMilestone.create({
          data: {
            projectedSaleId: projectedSale.id,
            milestoneName: 'One-Time Project Payment',
            percentage: 100.00,
            amount: Number(data.totalValue),
            dueDate: new Date(data.endDate),
            status: 'PENDING',
          }
        });
      }

      // Fetch complete record with milestones and customer info
      return tx.projectedSale.findUnique({
        where: { id: projectedSale.id },
        include: {
          milestones: true,
          customer: {
            select: { id: true, companyName: true, contactPerson: true, email: true },
          },
        },
      });
    });
  }

  // 3. Update Projected Sale details
  static async updateProjectedSale(id: string, data: any, userId: string) {
    const existing = await prisma.projectedSale.findUnique({
      where: { id, deletedAt: null },
      include: { milestones: true },
    });

    if (!existing) return null;

    // Merge core values
    const totalValue = data.totalValue !== undefined ? Number(data.totalValue) : Number(existing.totalValue);
    const gstPercentage = data.gstPercentage !== undefined ? Number(data.gstPercentage) : Number(existing.gstPercentage);
    const tdsPercentage = data.tdsPercentage !== undefined ? Number(data.tdsPercentage) : Number(existing.tdsPercentage);

    const financials = this.calculateFinancials({
      totalValue,
      gstPercentage,
      tdsPercentage,
    });

    const billingType = data.billingType !== undefined ? data.billingType : existing.billingType;

    // Enforce exclusive properties based on updated billingType
    let amcDuration = existing.amcDurationMonths;
    let amcCycle = existing.amcBillingCycle;
    let retainerAmount = existing.monthlyRetainerAmount;
    let retainerDuration = existing.retainerDurationMonths;

    if (billingType === 'AMC') {
      amcDuration = data.amcDurationMonths !== undefined ? data.amcDurationMonths : existing.amcDurationMonths;
      amcCycle = data.amcBillingCycle !== undefined ? data.amcBillingCycle : existing.amcBillingCycle;
      retainerAmount = null;
      retainerDuration = null;
    } else if (billingType === 'MONTHLY_RETAINER') {
      retainerAmount = data.monthlyRetainerAmount !== undefined ? data.monthlyRetainerAmount : existing.monthlyRetainerAmount;
      retainerDuration = data.retainerDurationMonths !== undefined ? data.retainerDurationMonths : existing.retainerDurationMonths;
      amcDuration = null;
      amcCycle = null;
    } else if (billingType === 'ONE_TIME') {
      amcDuration = null;
      amcCycle = null;
      retainerAmount = null;
      retainerDuration = null;
    } else if (billingType === 'MILESTONE_BASED') {
      amcDuration = null;
      amcCycle = null;
      retainerAmount = null;
      retainerDuration = null;
    }

    return prisma.$transaction(async (tx) => {
      // 1. If billing type is Milestone Based and milestones are passed, handle synchronization
      if (billingType === 'MILESTONE_BASED' && data.milestones !== undefined) {
        // Delete all old milestones first to replace them
        await tx.projectedSaleMilestone.deleteMany({
          where: { projectedSaleId: id },
        });

        if (data.milestones && data.milestones.length > 0) {
          const milestonesData = data.milestones.map((ms: any) => {
            const msPercentage = Number(ms.percentage);
            const msAmount = Number(((totalValue * msPercentage) / 100).toFixed(2));
            return {
              projectedSaleId: id,
              milestoneName: ms.milestoneName,
              percentage: msPercentage,
              amount: msAmount,
              dueDate: new Date(ms.dueDate),
              status: ms.status || 'PENDING',
            };
          });

          await tx.projectedSaleMilestone.createMany({
            data: milestonesData,
          });
        }
      } else if (billingType === 'MILESTONE_BASED' && data.totalValue !== undefined) {
        // If totalValue changed, but milestones array was not passed, we must update all milestone amounts proportionately
        const oldMilestones = await tx.projectedSaleMilestone.findMany({
          where: { projectedSaleId: id },
        });

        for (const ms of oldMilestones) {
          const msPercentage = Number(ms.percentage);
          const msAmount = Number(((totalValue * msPercentage) / 100).toFixed(2));
          await tx.projectedSaleMilestone.update({
            where: { id: ms.id },
            data: { amount: msAmount },
          });
        }
      } else if (billingType === 'ONE_TIME') {
        // If billing type is ONE_TIME, delete any existing milestones and recreate/update the single 100% milestone
        await tx.projectedSaleMilestone.deleteMany({
          where: { projectedSaleId: id },
        });

        const finalEndDate = data.endDate !== undefined ? new Date(data.endDate) : existing.endDate;
        await tx.projectedSaleMilestone.create({
          data: {
            projectedSaleId: id,
            milestoneName: 'One-Time Project Payment',
            percentage: 100.00,
            amount: totalValue,
            dueDate: new Date(finalEndDate),
            status: 'PENDING',
          }
        });
      } else if (billingType !== 'MILESTONE_BASED') {
        // If billing type changed away from milestones (to AMC or MONTHLY_RETAINER), delete all of them
        await tx.projectedSaleMilestone.deleteMany({
          where: { projectedSaleId: id },
        });
      }

      // Update core projected sale record
      const updatedSale = await tx.projectedSale.update({
        where: { id },
        data: {
          customerId: data.customerId !== undefined ? data.customerId : existing.customerId,
          projectName: data.projectName !== undefined ? data.projectName : existing.projectName,
          projectType: data.projectType !== undefined ? data.projectType : existing.projectType,
          billingType,
          totalValue,
          startDate: data.startDate !== undefined ? new Date(data.startDate) : existing.startDate,
          endDate: data.endDate !== undefined ? new Date(data.endDate) : existing.endDate,
          gstPercentage,
          tdsPercentage,
          gstAmount: financials.gstAmount,
          tdsAmount: financials.tdsAmount,
          finalAmount: financials.finalAmount,
          status: data.status !== undefined ? data.status : existing.status,
          notes: data.notes !== undefined ? data.notes : existing.notes,
          amcDurationMonths: amcDuration,
          amcBillingCycle: amcCycle,
          monthlyRetainerAmount: retainerAmount,
          retainerDurationMonths: retainerDuration,
          updatedBy: userId,
        },
      });

      return tx.projectedSale.findUnique({
        where: { id: updatedSale.id },
        include: {
          milestones: true,
          customer: {
            select: { id: true, companyName: true, contactPerson: true, email: true },
          },
        },
      });
    });
  }

  // 4. Update status separately
  static async updateStatus(id: string, status: ProjectedSaleStatus, userId: string) {
    const existing = await prisma.projectedSale.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existing) return null;

    return prisma.projectedSale.update({
      where: { id },
      data: {
        status,
        updatedBy: userId,
      },
      include: {
        milestones: true,
        customer: {
          select: { id: true, companyName: true, contactPerson: true },
        },
      },
    });
  }

  // 5. Delete Projected Sale (Dual Strategy: Soft or Hard delete)
  static async deleteProjectedSale(id: string, hard: boolean = false) {
    const existing = await prisma.projectedSale.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existing) return null;

    if (hard) {
      await prisma.projectedSale.delete({
        where: { id },
      });
      return { type: 'HARD' };
    } else {
      await prisma.projectedSale.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });
      return { type: 'SOFT' };
    }
  }

  // 6. Get Projected Sale by ID
  static async getProjectedSaleById(id: string) {
    return prisma.projectedSale.findUnique({
      where: { id, deletedAt: null },
      include: {
        milestones: {
          orderBy: { dueDate: 'asc' },
        },
        customer: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            phoneNumber: true,
            email: true,
            ccEmails: true,
            addressLine1: true,
            addressLine2: true,
            country: true,
            state: true,
            city: true,
            pincode: true,
            status: true,
            gstApplicable: true,
            gstinNumber: true,
            tdsApplicable: true,
            tdsPercentage: true,
          },
        },
      },
    });
  }

  // 7. Get all projected sales with filters, search, and pagination
  static async getProjectedSales(options: ProjectedSaleFilterOptions) {
    const {
      search,
      customerId,
      projectType,
      billingType,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = options;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.ProjectedSaleWhereInput = {
      deletedAt: null,
    };

    // Apply exact filters
    if (customerId) whereClause.customerId = customerId;
    if (projectType) whereClause.projectType = projectType;
    if (billingType) whereClause.billingType = billingType;
    if (status) whereClause.status = status;

    // Apply date range filters
    if (startDate || endDate) {
      whereClause.startDate = {};
      if (startDate) whereClause.startDate.gte = new Date(startDate);
      if (endDate) whereClause.startDate.lte = new Date(endDate);
    }

    // Apply search filter (Search in projectName, notes, companyName, or contactPerson)
    if (search) {
      whereClause.OR = [
        { projectName: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        {
          customer: {
            OR: [
              { companyName: { contains: search, mode: 'insensitive' } },
              { contactPerson: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [totalCount, projectedSales] = await Promise.all([
      prisma.projectedSale.count({ where: whereClause }),
      prisma.projectedSale.findMany({
        where: whereClause,
        include: {
          milestones: true,
          customer: {
            select: { id: true, companyName: true, contactPerson: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      projectedSales,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  // ==========================================
  // Milestone Level CRUD Management
  // ==========================================

  // A. Add Milestone to a Projected Sale
  // Since we require total percentage to equal 100%, the adding of a milestone will succeed ONLY if the new milestone's percentage
  // + the existing milestones' percentages sums up to exactly 100%. This usually means the user first edited existing milestone
  // percentages down, or they are setting up the structure.
  static async addMilestone(projectedSaleId: string, milestoneData: any, userId: string) {
    const sale = await prisma.projectedSale.findUnique({
      where: { id: projectedSaleId, deletedAt: null },
      include: { milestones: true },
    });

    if (!sale) return null;
    if (sale.billingType !== 'MILESTONE_BASED') {
      throw new Error('Milestones can only be added to a Projected Sale with Milestone Based billing');
    }

    const newPercentage = Number(milestoneData.percentage);
    const existingPercentageSum = sale.milestones.reduce((sum, ms) => sum + Number(ms.percentage), 0);

    if (Math.abs(existingPercentageSum + newPercentage - 100) > 0.01) {
      throw new Error(`Total milestone percentage must equal 100%. Current total with new milestone would be ${existingPercentageSum + newPercentage}%`);
    }

    const amount = Number(((Number(sale.totalValue) * newPercentage) / 100).toFixed(2));

    return prisma.$transaction(async (tx) => {
      const milestone = await tx.projectedSaleMilestone.create({
        data: {
          projectedSaleId,
          milestoneName: milestoneData.milestoneName,
          percentage: newPercentage,
          amount,
          dueDate: new Date(milestoneData.dueDate),
          status: milestoneData.status || 'PENDING',
        },
      });

      // Update audit
      await tx.projectedSale.update({
        where: { id: projectedSaleId },
        data: { updatedBy: userId },
      });

      return milestone;
    });
  }

  // B. Update an Individual Milestone
  static async updateMilestone(projectedSaleId: string, milestoneId: string, milestoneData: any, userId: string) {
    const sale = await prisma.projectedSale.findUnique({
      where: { id: projectedSaleId, deletedAt: null },
      include: { milestones: true },
    });

    if (!sale) return null;
    
    const milestoneToUpdate = sale.milestones.find((ms) => ms.id === milestoneId);
    if (!milestoneToUpdate) return null;

    const newPercentage = milestoneData.percentage !== undefined ? Number(milestoneData.percentage) : Number(milestoneToUpdate.percentage);
    
    // Check resulting total percentage
    const otherMilestonesPercentageSum = sale.milestones
      .filter((ms) => ms.id !== milestoneId)
      .reduce((sum, ms) => sum + Number(ms.percentage), 0);

    if (milestoneData.percentage !== undefined && Math.abs(otherMilestonesPercentageSum + newPercentage - 100) > 0.01) {
      throw new Error(`Total milestone percentage must equal 100%. Current total with this edit would be ${otherMilestonesPercentageSum + newPercentage}%`);
    }

    const amount = Number(((Number(sale.totalValue) * newPercentage) / 100).toFixed(2));

    return prisma.$transaction(async (tx) => {
      const updatedMilestone = await tx.projectedSaleMilestone.update({
        where: { id: milestoneId },
        data: {
          milestoneName: milestoneData.milestoneName !== undefined ? milestoneData.milestoneName : milestoneToUpdate.milestoneName,
          percentage: newPercentage,
          amount,
          dueDate: milestoneData.dueDate !== undefined ? new Date(milestoneData.dueDate) : milestoneToUpdate.dueDate,
          status: milestoneData.status !== undefined ? milestoneData.status : milestoneToUpdate.status,
        },
      });

      // Update audit
      await tx.projectedSale.update({
        where: { id: projectedSaleId },
        data: { updatedBy: userId },
      });

      return updatedMilestone;
    });
  }

  // C. Delete an Individual Milestone
  static async deleteMilestone(projectedSaleId: string, milestoneId: string, userId: string) {
    const sale = await prisma.projectedSale.findUnique({
      where: { id: projectedSaleId, deletedAt: null },
      include: { milestones: true },
    });

    if (!sale) return null;

    const milestoneToDelete = sale.milestones.find((ms) => ms.id === milestoneId);
    if (!milestoneToDelete) return null;

    // A delete will leave the remaining milestones at less than 100%.
    // To maintain integrity, we validate that the deletion is only allowed if it is the only remaining milestone
    // or if the remaining sum is adjusted. But for simplicity, we allow deleting only if they will sync the rest, OR
    // we require that the sum of remaining milestones equals 100% (which means they deleted a 0% milestone) OR we allow the deletion
    // and raise a warning/error, OR we provide a bulk-update route where they can re-align percentages.
    // The most robust business rule is to enforce the 100% check, but when deleting, they will have to adjust other percentages.
    // Therefore, deleting individual milestones is best done by a bulk sync, but if done individually, we check if the remaining
    // milestones equal 100% (which is rare), OR we throw an error unless they do a bulk update.
    // Let's enforce that:
    const remainingPercentageSum = sale.milestones
      .filter((ms) => ms.id !== milestoneId)
      .reduce((sum, ms) => sum + Number(ms.percentage), 0);

    if (Math.abs(remainingPercentageSum - 100) > 0.01 && remainingPercentageSum > 0) {
      throw new Error(`Cannot delete milestone individually as the remaining milestones total ${remainingPercentageSum}%, which is not 100%. Use bulk update projected sale to sync milestones and adjust percentages.`);
    }

    return prisma.$transaction(async (tx) => {
      await tx.projectedSaleMilestone.delete({
        where: { id: milestoneId },
      });

      // Update audit
      await tx.projectedSale.update({
        where: { id: projectedSaleId },
        data: { updatedBy: userId },
      });

      return { success: true };
    });
  }
}
