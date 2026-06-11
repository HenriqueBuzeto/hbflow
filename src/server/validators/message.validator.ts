import { z } from 'zod';
import { paginationSchema, sortSchema, searchSchema, uuidSchema } from './validation.helper';

export const createMessageSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  senderType: z.enum(['contact', 'user', 'system', 'automation', 'agent', 'internal_note', 'whisper']),
  senderId: z.string().uuid('Invalid sender ID').optional(),
  senderName: z.string().optional(),
  body: z.string().min(1, 'Body is required'),
  type: z.string().default('text'),
  mediaUrl: z.string().url('Invalid media URL').optional().or(z.literal('')),
  mimeType: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().int().positive('File size must be positive').optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  signatureUsed: z.string().optional(),
  channelMessageId: z.string().optional(),
  provider: z.string().default('whatsapp'),
  status: z.string().default('sent'),
  errorText: z.string().optional(),
  metadataJson: z.string().optional(),
}).strict();

export const updateMessageSchema = z.object({
  body: z.string().min(1, 'Body is required').optional(),
  type: z.string().optional(),
  mediaUrl: z.string().url('Invalid media URL').optional().or(z.literal('')),
  mimeType: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().int().positive('File size must be positive').optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  signatureUsed: z.string().optional(),
  isRead: z.boolean().optional(),
  channelMessageId: z.string().optional(),
  provider: z.string().optional(),
  status: z.string().optional(),
  errorText: z.string().optional(),
  metadataJson: z.string().optional(),
}).strict();

export const listMessagesQuerySchema = z.object({
  ...paginationSchema.shape,
  ...sortSchema.shape,
  ...searchSchema.shape,
  senderType: z.enum(['contact', 'user', 'system', 'automation', 'agent', 'internal_note', 'whisper']).optional(),
  status: z.string().optional(),
  provider: z.string().optional(),
}).refine((data) => {
  const allowedSortFields = ['createdAt', 'updatedAt'];
  if (data.sortBy && !allowedSortFields.includes(data.sortBy)) {
    return false;
  }
  return true;
}, {
  message: 'sortBy must be one of: createdAt, updatedAt',
  path: ['sortBy'],
});

export const messageIdParamsSchema = z.object({
  id: uuidSchema,
});

export const conversationIdParamsSchema = z.object({
  id: uuidSchema,
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type ListMessagesQueryInput = z.infer<typeof listMessagesQuerySchema>;
export type MessageIdParamsInput = z.infer<typeof messageIdParamsSchema>;
export type ConversationIdParamsInput = z.infer<typeof conversationIdParamsSchema>;
