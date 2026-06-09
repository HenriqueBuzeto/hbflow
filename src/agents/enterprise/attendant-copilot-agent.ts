import { HBAgent, AgentPriority, AgentResult, AgentExecutionContext, AgentAction } from '../core/agent.types';
import { callAIProvider } from '../services/ai-provider.service';
import { getConversationHistoryPrompt } from '../core/agent-memory';

export interface CopilotInput {
  conversationId: string;
}

export interface CopilotOutput {
  suggestions: Array<{
    type: "reply" | "action" | "product";
    text: string;
    confidence: number;
  }>;
  nextBestAction: string;
}

export const attendantCopilotAgent: HBAgent<CopilotInput, CopilotOutput> = {
  id: "attendant-copilot-agent",
  name: "Copilot do Atendente",
  description: "Sugere respostas contextualizadas e próximas ações em tempo real na tela do operador.",
  plan: "enterprise",
  priority: AgentPriority.HIGH,
  enabled: true,
  triggers: ["message.received"],
  
  async execute(input: CopilotInput, context: AgentExecutionContext): Promise<AgentResult<CopilotOutput>> {
    const start = Date.now();
    try {
      const messages = context.state.getMessages(input.conversationId);
      const historyText = getConversationHistoryPrompt(messages, 5);
      
      const prompt = `
Histórico de Conversa Recente:
${historyText}

Instruções:
Como assistente copilot do atendente, sugira a resposta mais polida e objetiva para o operador copiar ou utilizar.
Retorne exclusivamente o JSON correspondente.
`;

      const aiRes = await callAIProvider(prompt, "Você é o Copilot de Atendimento do HBFlow.");
      const data: CopilotOutput = JSON.parse(aiRes.text);
      
      // Copilot suggestions are not sent automatically; they are shown to the agent in the sidebar/popups.
      // So no actions are appended.
      
      return {
        success: true,
        agentId: this.id,
        output: data,
        confidence: 0.91,
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
        error: err?.message || "Erro no copilot",
      };
    }
  }
};
