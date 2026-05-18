"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employee_controller_1 = require("../controllers/employee.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Apply auth middleware to all employee routes
router.use(auth_middleware_1.authenticate);
// Dropdown list route (placed before ID route to prevent routing collision)
router.get('/dropdown', employee_controller_1.getEmployeeDropdown);
// Core CRUD Employee routes
router.get('/', employee_controller_1.getEmployees);
router.post('/', employee_controller_1.createEmployee);
router.get('/:id', employee_controller_1.getEmployeeById);
router.put('/:id', employee_controller_1.updateEmployee);
router.delete('/:id', employee_controller_1.deleteEmployee);
exports.default = router;
