import { HBAgent, AgentPriority, AgentResult, AgentExecutionContext, AgentAction } from '../core/agent.types';
import { callAIProvider } from '../services/ai-provider.service';
import { getConversationHistoryPrompt } from '../core/agent-memory';

export interface SalesCoachInput {
  conversationId: string;
}

export interface SalesCoachOutput {
  userId: string;
  score: number;
  strengths: string[];
  improvements: string[];
  coachingTips: string[];
}

export const salesCoachAgent: HBAgent<SalesCoachInput, SalesCoachOutput> = {
  id: "sales-coach-agent",
  name: "Coach de Vendas IA",
  description: "Audita conversas comerciais fechadas, dando feedbacks e dicas de técnicas de vendas aos operadores.",
  plan: "enterprise",
  priority: AgentPriority.MEDIUM,
  enabled: true,
  triggers: ["conversation.closed"],
  
  async execute(input: SalesCoachInput, context: AgentExecutionContext): Promise<AgentResult<SalesCoachOutput>> {
    const start = Date.now();
    try {
      const conv = context.state.getConversation(input.conversationId);
      const messages = context.state.getMessages(input.conversationId);
      const historyText = getConversationHistoryPrompt(messages);
      
      const prompt = `
Histórico Comercial para Feedback:
Vendedor ID: ${conv?.assignedUserId || 'Desconhecido'}
Conversa:
${historyText}

Instruções:
Como coach comercial sênior, avalie o atendimento do vendedor. Dê nota, aponte pontos fortes, melhorias e dicas de conversão.
Retorne exclusivamente o JSON correspondente.
`;

      const aiRes = await callAIProvider(prompt, "Você é o Coach de Vendas Comercial Sênior IA.");
      const data: SalesCoachOutput = JSON.parse(aiRes.text);
      
      const actions: AgentAction[] = [];
      
      const tipsText = `### 💡 FEEDBACK DE VENDAS (COACH IA)
**Nota Comercial**: ${data.score}/100
**Pontos Fortes**: ${data.strengths.join(', ')}
**Melhorar**: ${data.improvements.join(', ')}
**Dica Prática**: ${data.coachingTips.join(' ')}`;
      
      actions.push({
        type: "create_internal_note",
        text: tipsText
      });
      
      if (conv?.assignedUserId) {
        actions.push({
          type: "notify_user",
          userId: conv.assignedUserId,
          text: `💡 Novo feedback comercial do Coach IA disponível no chat fechado (Nota: ${data.score})`
        });
      }
      
      return {
        success: true,
        agentId: this.id,
        output: data,
        actions,
        confidence: 0.93,
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
        error: err?.message || "Erro desconhecido no coach de vendas",
      };
    }
  }
};
