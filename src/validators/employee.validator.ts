import { z } from 'zod';

export const employeeSchema = z.object({
  name: z.string().min(2, 'Employee name must be at least 2 characters long'),
});
