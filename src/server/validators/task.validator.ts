import { z } from 'zod';
import { paginationSchema, sortSchema, searchSchema, uuidSchema } from './validation.helper';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  contactId: z.string().uuid('Invalid contact ID').optional(),
  dealId: z.string().uuid('Invalid deal ID').optional(),
  conversationId: z.string().uuid('Invalid conversation ID').optional(),
  assignedUserId: z.string().uuid('Invalid user ID').optional(),
  dueAt: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['pending', 'completed', 'cancelled']).default('pending'),
  type: z.string(),
  notes: z.string().optional(),
}).strict();

export const updateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  contactId: z.string().uuid('Invalid contact ID').optional(),
  dealId: z.string().uuid('Invalid deal ID').optional(),
  conversationId: z.string().uuid('Invalid conversation ID').optional(),
  assignedUserId: z.string().uuid('Invalid user ID').optional(),
  dueAt: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  type: z.string().optional(),
  completedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
}).strict();

export const listTasksQuerySchema = z.object({
  ...paginationSchema.shape,
  ...sortSchema.shape,
  ...searchSchema.shape,
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  type: z.string().optional(),
  assignedUserId: z.string().uuid('Invalid user ID').optional(),
  contactId: z.string().uuid('Invalid contact ID').optional(),
  dealId: z.string().uuid('Invalid deal ID').optional(),
  conversationId: z.string().uuid('Invalid conversation ID').optional(),
  dueBefore: z.string().datetime().optional(),
  dueAfter: z.string().datetime().optional(),
}).refine((data) => {
  const allowedSortFields = ['dueAt', 'createdAt', 'updatedAt', 'priority', 'status'];
  if (data.sortBy && !allowedSortFields.includes(data.sortBy)) {
    return false;
  }
  return true;
}, {
  message: 'sortBy must be one of: dueAt, createdAt, updatedAt, priority, status',
  path: ['sortBy'],
});

export const taskIdParamsSchema = z.object({
  id: uuidSchema,
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQueryInput = z.infer<typeof listTasksQuerySchema>;
export type TaskIdParamsInput = z.infer<typeof taskIdParamsSchema>;
