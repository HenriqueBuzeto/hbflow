/**
 * HBFlow AI Operations Agent (Strategic Tier)
 * Responsável pela observabilidade, monitoramento de saúde dos agentes,
 * auditoria de erros em prompts, controle de tempo de resposta (timeouts)
 * e execução de políticas de fallback em produção.
 */

import { AgentResult } from '@/agents/core/agent.types';

export interface OperationsReport {
  timestamp: string;
  failuresCount: number;
  totalExecutions: number;
  failureRate: number;
  averageLatencyMs: number;
  accumulatedCost: number;
  anomaliesDetected: string[];
  recommendedActions: string[];
}

class AIOperationsAgentManager {
  private errorThresholdPercentage = 10; // 10% de tolerância a falhas

  /**
   * Monitora e audita o resultado de uma execução de agente
   */
  async auditExecution(
    agentId: string,
    durationMs: number,
    result: AgentResult<any>
  ): Promise<{ shouldTriggerFallback: boolean; fallbackReason?: string }> {
    console.log(`[AI Operations Agent] Auditando execução do "${agentId}" | Sucesso: ${result.success} | Latência: ${durationMs}ms`);

    // Alerta de lentidão crítica (Excedeu 4.5 segundos)
    if (durationMs > 4500) {
      console.warn(`[AI Operations Agent ⚠️] Latência crítica detectada no agente "${agentId}": ${durationMs}ms. Considerar downgrade de modelo.`);
    }

    if (!result.success) {
      console.error(`[AI Operations Agent 🚨] Erro de execução detectado no agente "${agentId}": ${result.error || 'Erro desconhecido'}`);
      
      // Heurística de Fallback: Se o agente comercial principal falhar, avisa para acionar suporte humano
      if (agentId === 'sdr-agent' || agentId === 'sales-agent') {
        return {
          shouldTriggerFallback: true,
          fallbackReason: `O agente "${agentId}" apresentou erro estrutural. Fallback para triagem/humano acionado.`
        };
      }
    }

    return { shouldTriggerFallback: false };
  }

  /**
   * Analisa logs agregados para gerar diagnóstico operacional do Workforce
   */
  generateHealthReport(logs: any[]): OperationsReport {
    const totalExecutions = logs.length;
    const failures = logs.filter((l) => !l.success);
    const failuresCount = failures.length;
    const failureRate = totalExecutions > 0 ? (failuresCount / totalExecutions) * 100 : 0;

    const totalLatency = logs.reduce((sum, l) => sum + (l.durationMs || 0), 0);
    const averageLatencyMs = totalExecutions > 0 ? Math.round(totalLatency / totalExecutions) : 0;

    const accumulatedCost = logs.reduce((sum, l) => sum + (l.cost || 0), 0);

    const anomaliesDetected: string[] = [];
    const recommendedActions: string[] = [];

    // Detecção de anomalias
    if (failureRate > this.errorThresholdPercentage) {
      anomaliesDetected.push(`Taxa de erro geral de IA está elevada (${failureRate.toFixed(1)}%).`);
      recommendedActions.push('Pausar agentes instáveis ou migrar provedor principal para modelo de backup (GPT-4o-mini).');
    }

    if (averageLatencyMs > 3000) {
      anomaliesDetected.push(`Tempo médio de resposta de IA elevado (${averageLatencyMs}ms).`);
      recommendedActions.push('Reduzir max_tokens ou substituir chamadas Claude 3.5 por chamadas de baixa latência Groq (Llama-3).');
    }

    const highCostTenants = logs.filter((l) => l.cost > 0.05); // Filtra transações > $0.05
    if (highCostTenants.length > 5) {
      anomaliesDetected.push('Detecção de consumo excessivo de tokens por requests gigantes.');
      recommendedActions.push('Implementar limite rígido de caracteres nas mensagens enviadas ao orquestrador.');
    }

    return {
      timestamp: new Date().toISOString(),
      failuresCount,
      totalExecutions,
      failureRate,
      averageLatencyMs,
      accumulatedCost,
      anomaliesDetected,
      recommendedActions
    };
  }
}

export const aiOperationsAgent = new AIOperationsAgentManager();
