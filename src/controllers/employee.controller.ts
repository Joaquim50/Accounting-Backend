import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employee.service';
import { employeeSchema } from '../validators/employee.validator';

// 1. Get all employees
export const getEmployees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, page, limit, startDate, endDate } = req.query;

    const result = await EmployeeService.getEmployees({
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    res.json({
      success: true,
      message: 'Employees retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get active employees dropdown list
export const getEmployeeDropdown = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employees = await EmployeeService.getEmployeeDropdown();
    res.json({
      success: true,
      message: 'Employee dropdown retrieved successfully',
      data: employees,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Get employee by ID
export const getEmployeeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const employee = await EmployeeService.getEmployeeById(id);

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
  } catch (error) {
    next(error);
  }
};

// 4. Create new employee
export const createEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedData = employeeSchema.parse(req.body);

    const employee = await EmployeeService.createEmployee({
      name: parsedData.name,
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Update employee details
export const updateEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const parsedData = employeeSchema.partial().parse(req.body);

    const employee = await EmployeeService.updateEmployee(id, {
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
  } catch (error) {
    next(error);
  }
};

// 6. Delete employee (Soft/Hard delete strategy)
export const deleteEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const isHardDelete = req.query.hard === 'true';

    const result = await EmployeeService.deleteEmployee(id, isHardDelete);

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
  } catch (error) {
    next(error);
  }
};
