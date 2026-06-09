import { z } from 'zod';

export const sentimentOutputSchema = z.object({
  sentiment: z.enum(['positive', 'neutral', 'negative', 'angry', 'urgent', 'churn_risk']),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  recommendedAction: z.string(),
});
