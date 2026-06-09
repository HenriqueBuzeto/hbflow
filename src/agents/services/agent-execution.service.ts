import { aiWorkforceOrchestrator } from '@/ai-workforce/orchestration/workforce-orchestrator';
import { AgentTrigger, AgentExecutionContext, AgentResult, AgentLog } from '../core/agent.types';
import { TenantPlan } from '../core/agent-permissions';
import { createAgentLog } from '../core/agent-logger';
import { agentRegistry } from '../core/agent-registry';
import { OrchestratorResult } from '../core/agent-orchestrator';

export const executeAgentTriggers = async (
  trigger: AgentTrigger,
  input: any,
  tenantPlan: TenantPlan,
  context: Omit<AgentExecutionContext, 'state'>,
  stateAccess: AgentExecutionContext['state'],
  enabledAgentIds: string[]
): Promise<OrchestratorResult> => {
  const workforceResults = await aiWorkforceOrchestrator.triggerWorkforceEvent(
    trigger,
    {
      tenantId: context.tenantId,
      tenantPlan,
      currentUserId: context.currentUserId,
      conversationId: context.conversationId,
      contactId: context.contactId,
      dealId: context.dealId,
      messageBody: typeof input === 'string' ? input : input?.messageBody || '',
      state: stateAccess
    }
  );

  const logs = workforceResults.map(res => {
    const agentObj = agentRegistry.find(a => a.id === res.agentId);
    return createAgentLog(
      context.tenantId,
      res.agentId,
      agentObj?.name || res.agentId,
      trigger,
      res.success,
      res.confidence || 0.85,
      res.actions?.length || 0,
      res.cost?.estimatedCost || 0.0001,
      250,
      JSON.stringify(input),
      res.success ? JSON.stringify(res.output || {}) : res.error || 'Falha na execução'
    );
  });

  return {
    results: workforceResults,
    logs
  };
};
