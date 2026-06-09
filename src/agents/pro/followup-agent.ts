import { HBAgent, AgentPriority, AgentResult, AgentExecutionContext, AgentAction } from '../core/agent.types';
import { callAIProvider } from '../services/ai-provider.service';

export interface FollowupInput {
  dealId?: string;
  contactId: string;
}

export interface FollowupOutput {
  shouldSend: boolean;
  message: string;
  channel: string;
  templateRequired: boolean;
  nextFollowUpInDays: number;
}

export const followupAgent: HBAgent<FollowupInput, FollowupOutput> = {
  id: "followup-agent",
  name: "Agente de Follow-up",
  description: "Gerencia cadências de follow-up automáticas para ofertas comerciais abertas.",
  plan: "pro",
  priority: AgentPriority.HIGH,
  enabled: true,
  triggers: ["deal.created", "deal.stage_changed", "task.due"],
  
  async execute(input: FollowupInput, context: AgentExecutionContext): Promise<AgentResult<FollowupOutput>> {
    const start = Date.now();
    try {
      const contact = context.state.getContact(input.contactId);
      const deal = input.dealId ? context.state.getDeal(input.dealId) : null;
      
      const prompt = `
Contexto de Follow-up:
Cliente: ${contact?.name || 'Indefinido'}
Score do Lead: ${contact?.score || 0}
Etiqueta Atual: ${contact?.tags?.join(', ') || 'Nenhuma'}
Negócio Ativo: ${deal ? deal.title : 'Nenhum'} (Valor: R$ ${deal ? deal.value : 0})

Instruções:
Decida se é necessário enviar uma mensagem de acompanhamento (follow-up) e elabore o texto correspondente.
Retorne exclusivamente o JSON.
`;

      const aiRes = await callAIProvider(prompt, "Você é o Agente de Acompanhamento Comercial (Follow-up) da HBFlow.");
      const data: FollowupOutput = JSON.parse(aiRes.text);
      
      const actions: AgentAction[] = [];
      
      if (data.shouldSend && data.message) {
        actions.push({
          type: "send_message",
          text: data.message,
          requireApproval: true // Follow-up requires operator consent
        });
      }
      
      if (data.nextFollowUpInDays > 0) {
        actions.push({
          type: "create_task",
          payload: {
            title: `Próximo follow-up - ${contact?.name || 'Cliente'}`,
            dueInDays: data.nextFollowUpInDays,
            priority: "low",
            notes: "Tarefa agendada automaticamente pela cadência IA."
          }
        });
      }
      
      return {
        success: true,
        agentId: this.id,
        output: data,
        actions,
        confidence: 0.94,
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
        error: err?.message || "Erro desconhecido no follow-up",
      };
    }
  }
};
