import { z } from 'zod';

export const triageOutputSchema = z.object({
  department: z.string().nullable(),
  intent: z.string(),
  confidence: z.number().min(0).max(1),
  tags: z.array(z.string()),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  shouldRoute: z.boolean(),
  suggestedUserId: z.string().optional(),
  reason: z.string(),
});
