"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeSchema = void 0;
const zod_1 = require("zod");
exports.employeeSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Employee name must be at least 2 characters long'),
});
