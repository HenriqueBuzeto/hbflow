import { z } from 'zod';

export const summaryOutputSchema = z.object({
  summary: z.string(),
  outcome: z.string(),
  nextStep: z.string(),
  sentiment: z.enum(['positive', 'neutral', 'negative', 'angry', 'churn_risk']),
  recommendedTasks: z.array(
    z.object({
      title: z.string(),
      dueInDays: z.number(),
    })
  ),
});
