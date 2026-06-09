/**
 * HBFlow AI Workforce Orchestrator
 * Coordena a execução de múltiplos agentes em hierarquia,
 * verificando orçamento (Cost Center), injetando memória de longo prazo (Long-Term Memory),
 * e auditando resultados via agente de operações (AI Operations Agent).
 */

import { AgentTrigger, AgentResult, AgentAction } from '@/agents/core/agent.types';
import { agentRegistry } from '@/agents/core/agent-registry';
import { isAgentAllowedForPlan } from '@/agents/core/agent-permissions';
import { aiCostCenter } from '../governance/cost-center';
import { agentLongTermMemory } from '../memory/agent-longterm-memory';
import { aiOperationsAgent } from '../monitoring/operations-agent';
import { hbSocket } from '@/lib/socket';
import { aiQueueManager } from '@/lib/queue';

export interface WorkforceExecutionContext {
  tenantId: string;
  tenantPlan: 'starter' | 'pro' | 'enterprise';
  currentUserId: string;
  conversationId?: string;
  contactId?: string;
  dealId?: string;
  messageBody?: string;
  state: any; // Zustand store query handlers
}

class AIWorkforceOrchestrator {
  /**
   * Dispara a execução encadeada da força de trabalho de IA com base em um evento gatilho
   */
  async triggerWorkforceEvent(
    trigger: AgentTrigger,
    context: WorkforceExecutionContext
  ): Promise<AgentResult<any>[]> {
    console.log(`[Workforce Orchestrator] Processando gatilho "${trigger}" para Tenant "${context.tenantId}"`);

    // 1. Governança Financeira: Bloqueia execução se o saldo do inquilino acabou
    if (!aiCostCenter.hasAvailableBalance(context.tenantId)) {
      const errorMsg = `Saldo de IA esgotado para o Tenant ${context.tenantId}. Ações bloqueadas.`;
      console.warn(`[Workforce Orchestrator ❌] ${errorMsg}`);
      
      // Emite alerta em tempo real via socket para o painel administrativo
      hbSocket.emit('workforce_alert', context.tenantId, {
        type: 'credit_exhausted',
        message: errorMsg
      });

      return [{
        success: false,
        agentId: 'orchestrator',
        error: errorMsg
      }];
    }

    // 2. Extração de Memória Semântica: Se for mensagem de entrada, aprende fatos sobre o cliente
    if (trigger === 'message.received' && context.contactId && context.messageBody) {
      agentLongTermMemory.autoExtractFacts(context.tenantId, context.contactId, context.messageBody);
    }

    // 3. Resolução de Agentes: Filtra agentes ativos com triggers compatíveis e plano permitido
    const allowedAgents = agentRegistry.filter((agent) => {
      const matchesTrigger = agent.triggers.includes(trigger);
      const matchesPlan = isAgentAllowedForPlan(agent.plan, context.tenantPlan);
      // Aqui poderíamos puxar se o agente foi desativado no banco pelo AgentConfig
      return matchesTrigger && matchesPlan;
    });

    if (allowedAgents.length === 0) {
      return [];
    }

    // Ordena por prioridade operacional (Critical -> High -> Medium -> Low)
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    allowedAgents.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    const results: AgentResult[] = [];

    // 4. Execução Hierárquica / Encadeada
    for (const agent of allowedAgents) {
      const startTime = Date.now();
      
      // Injeta a memória acumulada do contato caso exista
      let memoryContextPrompt = '';
      if (context.contactId) {
        memoryContextPrompt = agentLongTermMemory.compileMemoryPrompt(context.contactId);
      }

      // Prepara contexto de execução adaptado
      const executionContext = {
        tenantId: context.tenantId,
        currentUserId: context.currentUserId,
        conversationId: context.conversationId,
        contactId: context.contactId,
        dealId: context.dealId,
        state: context.state,
        metadata: {
          memoryPrompt: memoryContextPrompt,
          timestamp: new Date().toISOString()
        }
      };

      try {
        // Enfileira processamento assíncrono caso esteja em produção, ou roda imediatamente
        let result: AgentResult;

        if (process.env.NODE_ENV === 'production') {
          // Despacha para processamento assíncrono em fila com BullMQ/Redis
          console.log(`[Workforce Orchestrator] Enfileirando job para o agente "${agent.id}"`);
          const jobId = await aiQueueManager.addJob('ai-workforce-tasks', agent.id, {
            input: context.messageBody || {},
            context: executionContext
          });

          result = {
            success: true,
            agentId: agent.id,
            metadata: { jobId, status: 'queued' }
          };
        } else {
          // Roda de forma síncrona/imediata em desenvolvimento local
          result = await agent.execute(context.messageBody || {}, executionContext);
        }

        const duration = Date.now() - startTime;

        // 5. Cobrança do Consumo: Registra custos se gerados
        if (result.cost?.estimatedCost) {
          aiCostCenter.chargeTenant(context.tenantId, result.cost.estimatedCost);
        }

        // 6. Observabilidade e Auditoria (AI Operations Agent)
        const audit = await aiOperationsAgent.auditExecution(agent.id, duration, result);
        
        // Se auditoria apontar falha crítica no SDR/Vendas, executa fallback
        if (audit.shouldTriggerFallback) {
          console.log(`[Workforce Orchestrator ⚠️] Acionando fallback operacional para o agente "${agent.id}"`);
          result.actions = [
            ...(result.actions || []),
            { type: 'create_internal_note', text: `⚠️ Falha no agente comercial de IA (${agent.name}). Atendimento humano solicitado urgente.` },
            { type: 'escalate_conversation', reason: audit.fallbackReason || 'Erro de execução da IA.' }
          ];
        }

        results.push(result);

        // 7. Telemetria WebSockets: Envia logs das ações em tempo real para o painel admin
        hbSocket.emit('agent_executed', context.tenantId, {
          agentId: agent.id,
          success: result.success,
          durationMs: duration,
          cost: result.cost?.estimatedCost || 0,
          actionsCount: result.actions?.length || 0
        });

      } catch (err: any) {
        const duration = Date.now() - startTime;
        console.error(`[Workforce Orchestrator] Erro fatal executando agente "${agent.id}":`, err);
        
        results.push({
          success: false,
          agentId: agent.id,
          error: err?.message || 'Erro de execução interno do orchestrator'
        });
      }
    }

    return results;
  }
}

export const aiWorkforceOrchestrator = new AIWorkforceOrchestrator();
