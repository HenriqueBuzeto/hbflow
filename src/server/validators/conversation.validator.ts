import { z } from 'zod';
import { paginationSchema, sortSchema, searchSchema, uuidSchema } from './validation.helper';

export const createConversationSchema = z.object({
  contactId: z.string().uuid('Invalid contact ID'),
  departmentId: z.string().uuid('Invalid department ID').optional(),
  assignedUserId: z.string().uuid('Invalid user ID').optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  subject: z.string().optional(),
  channelId: z.string().uuid('Invalid channel ID').optional(),
}).strict();

export const updateConversationSchema = z.object({
  departmentId: z.string().uuid('Invalid department ID').optional(),
  assignedUserId: z.string().uuid('Invalid user ID').optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  subject: z.string().optional(),
  unreadCount: z.number().int().min(0).optional(),
}).strict();

export const listConversationsQuerySchema = z.object({
  ...paginationSchema.shape,
  ...sortSchema.shape,
  ...searchSchema.shape,
  status: z.string().optional(),
  priority: z.string().optional(),
  departmentId: z.string().uuid('Invalid department ID').optional(),
  assignedUserId: z.string().uuid('Invalid user ID').optional(),
  contactId: z.string().uuid('Invalid contact ID').optional(),
  channelId: z.string().uuid('Invalid channel ID').optional(),
}).refine((data) => {
  const allowedSortFields = ['createdAt', 'updatedAt', 'lastMessageAt', 'priority', 'status'];
  if (data.sortBy && !allowedSortFields.includes(data.sortBy)) {
    return false;
  }
  return true;
}, {
  message: 'sortBy must be one of: createdAt, updatedAt, lastMessageAt, priority, status',
  path: ['sortBy'],
});

export const conversationIdParamsSchema = z.object({
  id: uuidSchema,
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type ListConversationsQueryInput = z.infer<typeof listConversationsQuerySchema>;
export type ConversationIdParamsInput = z.infer<typeof conversationIdParamsSchema>;
