"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeService = void 0;
const db_1 = require("../db");
class EmployeeService {
    // 1. Get all employees (with pagination and search)
    static async getEmployees(options) {
        const { search, page = 1, limit = 10 } = options;
        const skip = (page - 1) * limit;
        const whereClause = {
            deletedAt: null,
        };
        // Apply search filter (name)
        if (search) {
            whereClause.name = { contains: search, mode: 'insensitive' };
        }
        const [totalCount, employees] = await Promise.all([
            db_1.prisma.employee.count({ where: whereClause }),
            db_1.prisma.employee.findMany({
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
    static async getEmployeeById(id) {
        return db_1.prisma.employee.findUnique({
            where: { id, deletedAt: null },
        });
    }
    // 3. Create employee
    static async createEmployee(data) {
        return db_1.prisma.employee.create({
            data: {
                name: data.name,
            },
        });
    }
    // 4. Update employee
    static async updateEmployee(id, data) {
        const employee = await db_1.prisma.employee.findUnique({
            where: { id, deletedAt: null },
        });
        if (!employee)
            return null;
        return db_1.prisma.employee.update({
            where: { id },
            data,
        });
    }
    // 5. Delete employee (Dual Strategy: Soft or Hard delete)
    static async deleteEmployee(id, hard = false) {
        const employee = await db_1.prisma.employee.findUnique({
            where: { id, deletedAt: null },
        });
        if (!employee)
            return null;
        if (hard) {
            await db_1.prisma.employee.delete({
                where: { id },
            });
            return { type: 'HARD' };
        }
        else {
            await db_1.prisma.employee.update({
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
        return db_1.prisma.employee.findMany({
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
exports.EmployeeService = EmployeeService;
