"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEmployee = exports.updateEmployee = exports.createEmployee = exports.getEmployeeById = exports.getEmployeeDropdown = exports.getEmployees = void 0;
const employee_service_1 = require("../services/employee.service");
const employee_validator_1 = require("../validators/employee.validator");
// 1. Get all employees
const getEmployees = async (req, res, next) => {
    try {
        const { search, page, limit, startDate, endDate } = req.query;
        const result = await employee_service_1.EmployeeService.getEmployees({
            search: search,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 10,
            startDate: startDate,
            endDate: endDate,
        });
        res.json({
            success: true,
            message: 'Employees retrieved successfully',
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getEmployees = getEmployees;
// 2. Get active employees dropdown list
const getEmployeeDropdown = async (req, res, next) => {
    try {
        const employees = await employee_service_1.EmployeeService.getEmployeeDropdown();
        res.json({
            success: true,
            message: 'Employee dropdown retrieved successfully',
            data: employees,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getEmployeeDropdown = getEmployeeDropdown;
// 3. Get employee by ID
const getEmployeeById = async (req, res, next) => {
    try {
        const id = req.params.id;
        const employee = await employee_service_1.EmployeeService.getEmployeeById(id);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found',
            });
        }
        res.json({
            success: true,
            message: 'Employee retrieved successfully',
            data: employee,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getEmployeeById = getEmployeeById;
// 4. Create new employee
const createEmployee = async (req, res, next) => {
    try {
        const parsedData = employee_validator_1.employeeSchema.parse(req.body);
        const employee = await employee_service_1.EmployeeService.createEmployee({
            name: parsedData.name,
        });
        res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            data: employee,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createEmployee = createEmployee;
// 5. Update employee details
const updateEmployee = async (req, res, next) => {
    try {
        const id = req.params.id;
        const parsedData = employee_validator_1.employeeSchema.partial().parse(req.body);
        const employee = await employee_service_1.EmployeeService.updateEmployee(id, {
            name: parsedData.name,
        });
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found',
            });
        }
        res.json({
            success: true,
            message: 'Employee updated successfully',
            data: employee,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateEmployee = updateEmployee;
// 6. Delete employee (Soft/Hard delete strategy)
const deleteEmployee = async (req, res, next) => {
    try {
        const id = req.params.id;
        const isHardDelete = req.query.hard === 'true';
        const result = await employee_service_1.EmployeeService.deleteEmployee(id, isHardDelete);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found',
            });
        }
        res.json({
            success: true,
            message: result.type === 'HARD'
                ? 'Employee permanently deleted'
                : 'Employee soft deleted successfully',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteEmployee = deleteEmployee;
