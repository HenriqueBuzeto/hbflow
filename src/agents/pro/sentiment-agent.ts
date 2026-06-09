import { HBAgent, AgentPriority, AgentResult, AgentExecutionContext, AgentAction } from '../core/agent.types';
import { callAIProvider } from '../services/ai-provider.service';
import { getConversationHistoryPrompt } from '../core/agent-memory';

export interface SentimentInput {
  conversationId: string;
}

export interface SentimentOutput {
  sentiment: "positive" | "neutral" | "negative" | "angry" | "urgent" | "churn_risk";
  riskLevel: "low" | "medium" | "high" | "critical";
  confidence: number;
  reason: string;
  recommendedAction: string;
}

export const sentimentAgent: HBAgent<SentimentInput, SentimentOutput> = {
  id: "sentiment-agent",
  name: "Agente de Sentimento",
  description: "Mapeia humor, risco de perda (churn) e urgência emocional nas mensagens.",
  plan: "pro",
  priority: AgentPriority.HIGH, // Dynamically critical under core, baseline High
  enabled: true,
  triggers: ["message.received"],
  
  async execute(input: SentimentInput, context: AgentExecutionContext): Promise<AgentResult<SentimentOutput>> {
    const start = Date.now();
    try {
      const messages = context.state.getMessages(input.conversationId);
      const historyText = getConversationHistoryPrompt(messages, 5); // check last 5 messages
      
      const prompt = `
Últimas mensagens trocadas:
${historyText}

Instruções:
Avalie o humor das mensagens. Classifique o sentimento, nível de risco e recomende ações de escalabilidade.
Retorne exclusivamente o JSON correspondente.
`;

      const aiRes = await callAIProvider(prompt, "Você é o Analista de Sentimentos da HBFlow.");
      const data: SentimentOutput = JSON.parse(aiRes.text);
      
      const actions: AgentAction[] = [];
      
      if (data.sentiment === 'angry' || data.sentiment === 'churn_risk' || data.riskLevel === 'critical' || data.riskLevel === 'high') {
        // High emotional risk alerts supervisor immediately
        actions.push({ type: "apply_tag", tag: "cliente-insatisfeito" });
        actions.push({ type: "escalate_conversation", reason: `Sentimento Crítico: ${data.reason}` });
        actions.push({ type: "notify_role", role: "Supervisor", text: `Cliente insatisfeito no chat: "${data.reason}"` });
      }
      
      return {
        success: true,
        agentId: this.id,
        output: data,
        actions,
        confidence: data.confidence,
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
        error: err?.message || "Erro desconhecido na análise de sentimentos",
      };
    }
  }
};
