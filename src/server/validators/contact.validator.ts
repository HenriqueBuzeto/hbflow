import { z } from 'zod';
import { paginationSchema, sortSchema, searchSchema, uuidSchema } from './validation.helper';

export const createContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  responsibleUserId: z.string().uuid('Invalid user ID').optional().or(z.literal('')),
  status: z.string().optional(),
  temperature: z.string().optional(),
  source: z.string().optional(),
}).strict();

export const updateContactSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  phone: z.string().min(1, 'Phone is required').optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  assignedUserId: z.string().uuid('Invalid user ID').optional().or(z.literal('')),
  status: z.string().optional(),
  temperature: z.string().optional(),
  source: z.string().optional(),
}).strict();

export const listContactsQuerySchema = z.object({
  ...paginationSchema.shape,
  ...sortSchema.shape,
  ...searchSchema.shape,
  status: z.string().optional(),
  assignedUserId: z.string().uuid('Invalid user ID').optional().or(z.literal('')),
  tag: z.string().optional(),
  source: z.string().optional(),
  temperature: z.string().optional(),
  minValue: z.string().optional(),
  maxValue: z.string().optional(),
}).refine((data) => {
  const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'temperature'];
  if (data.sortBy && !allowedSortFields.includes(data.sortBy)) {
    return false;
  }
  return true;
}, {
  message: 'sortBy must be one of: createdAt, updatedAt, name, temperature',
  path: ['sortBy'],
});

export const contactIdParamsSchema = z.object({
  id: uuidSchema,
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ListContactsQueryInput = z.infer<typeof listContactsQuerySchema>;
export type ContactIdParamsInput = z.infer<typeof contactIdParamsSchema>;
