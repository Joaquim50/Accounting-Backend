import { prisma } from '../db';
import { Employee, Prisma } from '@prisma/client';

export interface EmployeeFilterOptions {
  search?: string;
  page?: number;
  limit?: number;
}

export class EmployeeService {
  // 1. Get all employees (with pagination and search)
  static async getEmployees(options: EmployeeFilterOptions) {
    const { search, page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.EmployeeWhereInput = {
      deletedAt: null,
    };

    // Apply search filter (name)
    if (search) {
      whereClause.name = { contains: search, mode: 'insensitive' };
    }

    const [totalCount, employees] = await Promise.all([
      prisma.employee.count({ where: whereClause }),
      prisma.employee.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      employees,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  // 2. Get employee by ID
  static async getEmployeeById(id: string) {
    return prisma.employee.findUnique({
      where: { id, deletedAt: null },
    });
  }

  // 3. Create employee
  static async createEmployee(data: { name: string }) {
    return prisma.employee.create({
      data: {
        name: data.name,
      },
    });
  }

  // 4. Update employee
  static async updateEmployee(id: string, data: { name?: string }) {
    const employee = await prisma.employee.findUnique({
      where: { id, deletedAt: null },
    });

    if (!employee) return null;

    return prisma.employee.update({
      where: { id },
      data,
    });
  }

  // 5. Delete employee (Dual Strategy: Soft or Hard delete)
  static async deleteEmployee(id: string, hard: boolean = false) {
    const employee = await prisma.employee.findUnique({
      where: { id, deletedAt: null },
    });

    if (!employee) return null;

    if (hard) {
      await prisma.employee.delete({
        where: { id },
      });
      return { type: 'HARD' };
    } else {
      await prisma.employee.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });
      return { type: 'SOFT' };
    }
  }

  // 6. Get Employee Dropdown list (returns only id and name)
  static async getEmployeeDropdown() {
    return prisma.employee.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
