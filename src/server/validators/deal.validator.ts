import { z } from 'zod';
import { paginationSchema, sortSchema, searchSchema, uuidSchema } from './validation.helper';

export const createDealSchema = z.object({
  contactId: z.string().uuid('Invalid contact ID'),
  conversationId: z.string().uuid('Invalid conversation ID').optional(),
  pipelineId: z.string().uuid('Invalid pipeline ID'),
  stageId: z.string().uuid('Invalid stage ID'),
  ownerUserId: z.string().uuid('Invalid user ID').optional(),
  title: z.string().min(1, 'Title is required'),
  value: z.number().min(0, 'Value must be non-negative').default(0.0),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.string().datetime().optional(),
  status: z.enum(['open', 'won', 'lost']).optional(),
  source: z.string().optional(),
  products: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    quantity: z.number().int().positive().default(1),
    unitPrice: z.number().min(0).default(0.0),
  })).optional(),
  notes: z.string().optional(),
}).strict();

export const updateDealSchema = z.object({
  contactId: z.string().uuid('Invalid contact ID').optional(),
  conversationId: z.string().uuid('Invalid conversation ID').optional(),
  pipelineId: z.string().uuid('Invalid pipeline ID').optional(),
  stageId: z.string().uuid('Invalid stage ID').optional(),
  ownerUserId: z.string().uuid('Invalid user ID').optional(),
  title: z.string().min(1, 'Title is required').optional(),
  value: z.number().min(0, 'Value must be non-negative').optional(),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.string().datetime().optional(),
  status: z.enum(['open', 'won', 'lost']).optional(),
  source: z.string().optional(),
  lossReasonId: z.string().uuid('Invalid loss reason ID').optional(),
  wonAt: z.string().datetime().optional(),
  lostAt: z.string().datetime().optional(),
  products: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    quantity: z.number().int().positive().default(1),
    unitPrice: z.number().min(0).default(0.0),
  })).optional(),
  notes: z.string().optional(),
}).strict();

export const listDealsQuerySchema = z.object({
  ...paginationSchema.shape,
  ...sortSchema.shape,
  ...searchSchema.shape,
  status: z.enum(['open', 'won', 'lost']).optional(),
  pipelineId: z.string().uuid('Invalid pipeline ID').optional(),
  stageId: z.string().uuid('Invalid stage ID').optional(),
  ownerUserId: z.string().uuid('Invalid user ID').optional(),
  contactId: z.string().uuid('Invalid contact ID').optional(),
  conversationId: z.string().uuid('Invalid conversation ID').optional(),
  source: z.string().optional(),
  minValue: z.string().optional(),
  maxValue: z.string().optional(),
}).refine((data) => {
  const allowedSortFields = ['createdAt', 'updatedAt', 'expectedCloseDate', 'value', 'probability'];
  if (data.sortBy && !allowedSortFields.includes(data.sortBy)) {
    return false;
  }
  return true;
}, {
  message: 'sortBy must be one of: createdAt, updatedAt, expectedCloseDate, value, probability',
  path: ['sortBy'],
});

export const dealIdParamsSchema = z.object({
  id: uuidSchema,
});

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type ListDealsQueryInput = z.infer<typeof listDealsQuerySchema>;
export type DealIdParamsInput = z.infer<typeof dealIdParamsSchema>;
