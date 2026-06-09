import { AgentLog } from './agent.types';
import { generateExecutionId } from './agent-utils';

export const createAgentLog = (
  tenantId: string,
  agentId: string,
  agentName: string,
  trigger: string,
  success: boolean,
  confidence: number,
  actionsCount: number,
  cost: number,
  durationMs: number,
  inputSummary: string,
  outputSummary: string
): AgentLog => {
  return {
    id: generateExecutionId(),
    tenantId,
    agentId,
    agentName,
    trigger,
    success,
    confidence,
    actionsCount,
    cost,
    durationMs,
    inputSummary,
    outputSummary,
    createdAt: new Date().toISOString(),
  };
};
