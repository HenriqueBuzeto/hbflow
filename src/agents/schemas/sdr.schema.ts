import { z } from 'zod';

export const sdrOutputSchema = z.object({
  leadScore: z.number().min(0).max(100),
  temperature: z.enum(['frio', 'morno', 'quente']),
  qualificationStatus: z.enum(['qualified', 'unqualified', 'nurturing']),
  missingFields: z.array(z.string()),
  shouldCreateDeal: z.boolean(),
  suggestedPipelineStage: z.string().optional(),
  suggestedMessage: z.string(),
});
