"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employee_controller_1 = require("../controllers/employee.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Apply auth middleware to all employee routes
router.use(auth_middleware_1.authenticate);
// Dropdown list route (placed before ID route to prevent routing collision)
router.get('/dropdown', (0, auth_middleware_1.authorizePermission)('employees.view'), employee_controller_1.getEmployeeDropdown);
// Core CRUD Employee routes
router.get('/', (0, auth_middleware_1.authorizePermission)('employees.view'), employee_controller_1.getEmployees);
router.post('/', (0, auth_middleware_1.authorizePermission)('employees.create'), employee_controller_1.createEmployee);
router.get('/:id', (0, auth_middleware_1.authorizePermission)('employees.view'), employee_controller_1.getEmployeeById);
router.put('/:id', (0, auth_middleware_1.authorizePermission)('employees.edit'), employee_controller_1.updateEmployee);
router.delete('/:id', (0, auth_middleware_1.authorizePermission)('employees.delete'), employee_controller_1.deleteEmployee);
exports.default = router;
