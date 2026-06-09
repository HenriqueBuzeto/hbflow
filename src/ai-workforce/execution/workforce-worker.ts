/**
 * HBFlow AI Workforce Worker Runner
 * Executa tarefas e processa jobs de segundo plano delegados pelas filas (BullMQ/Redis).
 * Integra orquestração, segurança de injeção, logs no banco e chamadas a provedores.
 */

import { aiQueueManager } from '@/lib/queue';
import { aiWorkforceOrchestrator, WorkforceExecutionContext } from '../orchestration/workforce-orchestrator';
import { WorkforceReasoningPlanner } from '../reasoning/reasoning-chain';
import { WorkforceContextResolver } from '../context/workforce-context';
import { aiOperationsAgent } from '../monitoring/operations-agent';
import { aiCostCenter } from '../governance/cost-center';

export class WorkforceQueueWorker {
  constructor() {
    this.initWorkers();
  }

  private initWorkers() {
    // Registra listener no gerenciador de filas para processar tarefas delegadas de IA
    aiQueueManager.registerWorker('ai-workforce-tasks', '*', async (job) => {
      console.log(`[Queue Worker] Iniciando processamento do Job ${job.id} - Agente: ${job.name}`);
      
      const { input, context } = job.data as { input: any; context: any };
      
      // 1. Verifica saldo do tenant antes de rodar
      if (!aiCostCenter.hasAvailableBalance(context.tenantId)) {
        throw new Error(`Saldo de IA esgotado para o Tenant ${context.tenantId}.`);
      }

      // 2. Resolve contexto unificado
      const unifiedContext = WorkforceContextResolver.resolve(context.state || {}, {
        tenantId: context.tenantId,
        userId: context.currentUserId,
        contactId: context.contactId,
        conversationId: context.conversationId
      });

      // 3. Executa a Cadeia de Raciocínio (Reasoning Chain)
      const messageBody = typeof input === 'string' ? input : input?.messageBody || '';
      const plan = WorkforceReasoningPlanner.planExecution('message.received', messageBody);

      console.log(`[Queue Worker] Plano de execução elaborado: ${plan.map(p => p.agentId).join(' -> ')}`);

      // 4. Executa agentes do plano de forma resiliente
      const executionContext: WorkforceExecutionContext = {
        tenantId: context.tenantId,
        tenantPlan: unifiedContext.plan,
        currentUserId: context.currentUserId,
        conversationId: context.conversationId,
        contactId: context.contactId,
        dealId: context.dealId,
        messageBody,
        state: context.state
      };

      // Roda o orquestrador no contexto real
      await aiWorkforceOrchestrator.triggerWorkforceEvent('message.received', executionContext);
      
      console.log(`[Queue Worker] Job ${job.id} concluído com sucesso.`);
    });
  }
}

export const workforceQueueWorker = new WorkforceQueueWorker();
