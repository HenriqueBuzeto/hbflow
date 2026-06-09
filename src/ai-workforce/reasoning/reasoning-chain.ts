/**
 * HBFlow AI Workforce Reasoning Chain Planner
 * Abstração para "Chain of Thought" (Cadeia de Raciocínio) e coordenação hierárquica.
 * Permite que um Agente Supervisor decida quais sub-agentes acionar
 * em vez de disparar execuções lineares estáticas.
 */

import { AgentTrigger } from '@/agents/core/agent.types';

export interface TaskStep {
  stepIndex: number;
  agentId: string;
  purpose: string;
  requiredBefore: string[];
  status: 'pending' | 'executing' | 'completed' | 'skipped';
}

export class WorkforceReasoningPlanner {
  /**
   * Planeja dinamicamente quais agentes de IA devem rodar com base na mensagem e gatilho
   */
  static planExecution(trigger: AgentTrigger, messageBody: string): TaskStep[] {
    const steps: TaskStep[] = [];
    const text = messageBody.toLowerCase();

    // Passo 1: Triagem e Sentimento sempre rodam em novas interações
    if (trigger === 'message.received') {
      steps.push({
        stepIndex: 1,
        agentId: 'triage-agent',
        purpose: 'Classificar intenção inicial e setor de destino',
        requiredBefore: [],
        status: 'pending'
      });

      steps.push({
        stepIndex: 2,
        agentId: 'sentiment-agent',
        purpose: 'Detectar nível de risco emocional do lead',
        requiredBefore: [],
        status: 'pending'
      });

      // Passo 3: Se houver indícios comerciais, aciona qualificação (SDR)
      if (text.includes('preço') || text.includes('quanto custa') || text.includes('comprar') || text.includes('orçamento')) {
        steps.push({
          stepIndex: 3,
          agentId: 'sdr-agent',
          purpose: 'Coletar informações comerciais de interesse e qualificar lead',
          requiredBefore: ['triage-agent'],
          status: 'pending'
        });
      } else {
        // Fallback: Se for uma pergunta comum, aciona FAQ
        steps.push({
          stepIndex: 3,
          agentId: 'faq-agent',
          purpose: 'Tentar responder pergunta frequente com base de conhecimento',
          requiredBefore: ['triage-agent'],
          status: 'pending'
        });
      }
    } else if (trigger === 'conversation.closed') {
      steps.push({
        stepIndex: 1,
        agentId: 'summary-agent',
        purpose: 'Resumir o atendimento encerrado para notas do CRM',
        requiredBefore: [],
        status: 'pending'
      });

      steps.push({
        stepIndex: 2,
        agentId: 'sales-coach-agent',
        purpose: 'Avaliar performance de conversão comercial do atendente',
        requiredBefore: ['summary-agent'],
        status: 'pending'
      });
    }

    return steps;
  }
}
