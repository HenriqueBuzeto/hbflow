import { HBAgent, AgentPriority, AgentResult, AgentExecutionContext, AgentAction } from '../core/agent.types';
import { callAIProvider } from '../services/ai-provider.service';
import { getConversationHistoryPrompt } from '../core/agent-memory';

export interface SalesInput {
  conversationId: string;
}

export interface SalesOutput {
  suggestedReply: string;
  objectionDetected: "price" | "competitor" | "time" | "none";
  salesStageSuggestion: string;
  shouldEscalateToHuman: boolean;
}

export const salesAgent: HBAgent<SalesInput, SalesOutput> = {
  id: "sales-agent",
  name: "Agente Comercial",
  description: "Auxilia vendedores contornando objeções, sugerindo propostas e ajudando no fechamento.",
  plan: "pro",
  priority: AgentPriority.HIGH,
  enabled: true,
  triggers: ["message.received"],
  
  async execute(input: SalesInput, context: AgentExecutionContext): Promise<AgentResult<SalesOutput>> {
    const start = Date.now();
    try {
      const messages = context.state.getMessages(input.conversationId);
      const historyText = getConversationHistoryPrompt(messages);
      
      const prompt = `
Histórico de Negociação:
${historyText}

Instruções:
Sugira a melhor resposta comercial para contornar a objeção ou conduzir o fechamento.
Retorne exclusivamente o JSON correspondente.
`;

      const aiRes = await callAIProvider(prompt, "Você é o Agente de Vendas do HBFlow.");
      const data: SalesOutput = JSON.parse(aiRes.text);
      
      const actions: AgentAction[] = [];
      
      if (data.suggestedReply && !data.shouldEscalateToHuman) {
        actions.push({
          type: "send_message",
          text: data.suggestedReply,
          requireApproval: true // Vendedores devem aprovar as sugestões comerciais
        });
      }
      
      if (data.objectionDetected !== 'none') {
        actions.push({ type: "apply_tag", tag: `objeção-${data.objectionDetected}` });
      }

      if (context.dealId && data.salesStageSuggestion) {
        actions.push({
          type: "update_deal_stage",
          dealId: context.dealId,
          stageId: data.salesStageSuggestion
        });
      }
      
      return {
        success: true,
        agentId: this.id,
        output: data,
        actions,
        confidence: 0.88,
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
        error: err?.message || "Erro desconhecido no suporte comercial",
      };
    }
  }
};
