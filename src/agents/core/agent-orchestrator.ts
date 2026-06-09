import { agentRegistry } from './agent-registry';
import { isAgentAllowedForPlan, TenantPlan } from './agent-permissions';
import { sortAgentsByPriority } from './agent-priority';
import { AgentTrigger, AgentExecutionContext, AgentResult, AgentLog } from './agent.types';
import { createAgentLog } from './agent-logger';

export interface OrchestratorResult {
  logs: AgentLog[];
  results: AgentResult[];
}

export const runOrchestrator = async (
  trigger: AgentTrigger,
  input: any,
  tenantPlan: TenantPlan,
  context: Omit<AgentExecutionContext, 'state'>,
  stateAccess: AgentExecutionContext['state'],
  enabledAgentIds: string[] 
): Promise<OrchestratorResult> => {
  const matchingAgents = agentRegistry.filter(
    (agent) => agent.triggers.includes(trigger)
  );

  const allowedAgents = matchingAgents.filter((agent) => {
    const isAllowed = isAgentAllowedForPlan(agent.plan, tenantPlan);
    const isEnabled = enabledAgentIds.includes(agent.id);
    return isAllowed && isEnabled;
  });

  const sortedAgents = sortAgentsByPriority(allowedAgents);

  const results: AgentResult[] = [];
  const logs: AgentLog[] = [];

  const executionContext: AgentExecutionContext = {
    ...context,
    state: stateAccess
  };

  for (const agent of sortedAgents) {
    const startTime = Date.now();
    try {
      const result = await agent.execute(input, executionContext);
      const durationMs = Date.now() - startTime;
      results.push(result);

      const log = createAgentLog(
        context.tenantId,
        agent.id,
        agent.name,
        trigger,
        result.success,
        result.confidence || 0.85,
        result.actions?.length || 0,
        result.cost?.estimatedCost || 0.0001,
        durationMs,
        JSON.stringify(input),
        result.success ? JSON.stringify(result.output || {}) : result.error || 'Falha na execução'
      );
      logs.push(log);
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorResult: AgentResult = {
        success: false,
        agentId: agent.id,
        error: err?.message || 'Erro inesperado no orquestrador',
      };
      results.push(errorResult);

      const log = createAgentLog(
        context.tenantId,
        agent.id,
        agent.name,
        trigger,
        false,
        0,
        0,
        0,
        durationMs,
        JSON.stringify(input),
        err?.message || 'Erro de execução'
      );
      logs.push(log);
    }
  }

  return {
    results,
    logs
  };
};
