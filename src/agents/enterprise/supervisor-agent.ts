import { HBAgent, AgentPriority, AgentResult, AgentExecutionContext, AgentAction } from '../core/agent.types';
import { callAIProvider } from '../services/ai-provider.service';

export interface SupervisorInput {
  conversationId: string;
}

export interface SupervisorOutput {
  alertType: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  recommendedAction: "notify_supervisor" | "reassign_agent" | "escalate_to_admin" | "none";
  targetUserId?: string;
}

export const supervisorAgent: HBAgent<SupervisorInput, SupervisorOutput> = {
  id: "supervisor-agent",
  name: "Supervisor IA",
  description: "Monitora filas, tempos de espera e SLAs de atendimento, escalando desequilíbrios.",
  plan: "enterprise",
  priority: AgentPriority.CRITICAL,
  enabled: true,
  triggers: ["sla.warning", "sla.expired", "message.received"],
  
  async execute(input: SupervisorInput, context: AgentExecutionContext): Promise<AgentResult<SupervisorOutput>> {
    const start = Date.now();
    try {
      const conv = context.state.getConversation(input.conversationId);
      const messages = context.state.getMessages(input.conversationId);
      
      const prompt = `
Status de Conversa:
Atendente Atual: ${conv?.assignedUserId || 'Ninguém'}
Total de Mensagens: ${messages.length}
SLA Limite: ${conv?.slaLimitAt || 'Indefinido'}

Instruções:
Monitore e analise o cumprimento das metas operacionais da conversa. 
Identifique se há atraso na resposta e sugira ação corretiva.
Retorne exclusivamente o JSON correspondente.
`;

      const aiRes = await callAIProvider(prompt, "Você é o Supervisor IA de Qualidade de Atendimento.");
      const data: SupervisorOutput = JSON.parse(aiRes.text);
      
      const actions: AgentAction[] = [];
      
      if (data.recommendedAction === 'notify_supervisor' && data.targetUserId) {
        actions.push({
          type: "notify_user",
          userId: data.targetUserId,
          text: `⚠️ SLA ALERTA: ${data.message}`
        });
      } else if (data.recommendedAction === 'reassign_agent' && data.targetUserId) {
        actions.push({
          type: "assign_to_user",
          userId: data.targetUserId
        });
        actions.push({
          type: "create_internal_note",
          text: `🤖 Supervisor IA: Conversa reatribuída para equilíbrio de workloads.`
        });
      }
      
      return {
        success: true,
        agentId: this.id,
        output: data,
        actions,
        confidence: 0.96,
        cost: {
          inputTokens: aiRes.inputTokens,
          outputTokens: aiRes.outputTokens,
          estimatedCost: aiRes.estimatedCost
        },
        metadata: {
          durationMs: Date.now() - start
        }
      };
    } catch (err: any) {
      return {
        success: false,
        agentId: this.id,
        error: err?.message || "Erro desconhecido na supervisão operacional",
      };
    }
  }
};
