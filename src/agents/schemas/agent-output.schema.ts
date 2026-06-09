import { z } from 'zod';

export const agentOutputSchema = z.object({
  success: z.boolean(),
  agentId: z.string(),
  output: z.any().optional(),
  confidence: z.number().optional(),
  error: z.string().optional(),
});
