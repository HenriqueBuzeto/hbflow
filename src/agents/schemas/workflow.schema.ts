import { z } from 'zod';

export const workflowOutputSchema = z.object({
  workflowTriggered: z.string(),
  workflowId: z.string(),
  executionSuccess: z.boolean(),
  actionsExecuted: z.array(z.string()),
  logs: z.array(z.string()),
});
