import { z } from 'zod';

export const agentInputSchema = z.object({
  body: z.string().min(1, "Mensagem vazia inválida"),
  senderType: z.enum(['contact', 'user', 'system', 'automation', 'internal_note', 'whisper']),
  senderName: z.string(),
  conversationId: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
});
