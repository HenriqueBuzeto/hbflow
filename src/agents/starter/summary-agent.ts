import { HBAgent, AgentPriority, AgentResult, AgentExecutionContext, AgentAction } from '../core/agent.types';
import { callAIProvider } from '../services/ai-provider.service';
import { getConversationHistoryPrompt } from '../core/agent-memory';

export interface SummaryInput {
  conversationId: string;
}

export interface SummaryOutput {
  summary: string;
  outcome: string;
  nextStep: string;
  sentiment: "positive" | "neutral" | "negative" | "angry" | "churn_risk";
  recommendedTasks: Array<{
    title: string;
    dueInDays: number;
  }>;
}

export const summaryAgent: HBAgent<SummaryInput, SummaryOutput> = {
  id: "summary-agent",
  name: "Agente de Resumo",
  description: "Gera resumos analíticos e sugere tarefas no CRM no fechamento de cada atendimento.",
  plan: "starter",
  priority: AgentPriority.MEDIUM,
  enabled: true,
  triggers: ["conversation.closed"],
  
  async execute(input: SummaryInput, context: AgentExecutionContext): Promise<AgentResult<SummaryOutput>> {
    const start = Date.now();
    try {
      const messages = context.state.getMessages(input.conversationId);
      const historyText = getConversationHistoryPrompt(messages);
      
      const prompt = `
Histórico de Conversa:
${historyText}

Instruções:
Elabore um resumo do atendimento, classifique o resultado (outcome), o sentimento do cliente, os próximos passos e sugira tarefas se necessário.
Retorne exclusivamente o JSON correspondente.
`;

      const aiRes = await callAIProvider(prompt, "Você é o Agente de Resumo de Atendimentos.");
      const data: SummaryOutput = JSON.parse(aiRes.text);
      
      const actions: AgentAction[] = [];
      
      // Save summary as internal note
      const formattedNote = `### 🤖 RELATÓRIO DE FECHAMENTO IA
**Resumo**: ${data.summary}
**Resultado**: ${data.outcome}
**Sentimento**: ${data.sentiment}
**Próxima Ação**: ${data.nextStep}`;
      
      actions.push({ type: "create_internal_note", text: formattedNote });
      
      // Update contact score based on outcome/sentiment
      let scoreChange = 5;
      if (data.sentiment === 'positive') scoreChange = 10;
      else if (data.sentiment === 'angry' || data.sentiment === 'churn_risk') scoreChange = -20;
      actions.push({ type: "update_contact_score", score: scoreChange });

      // Create recommended tasks
      if (data.recommendedTasks && data.recommendedTasks.length > 0) {
        for (const task of data.recommendedTasks) {
          actions.push({
            type: "create_task",
            payload: {
              title: task.title,
              dueInDays: task.dueInDays,
              priority: "medium",
              notes: `Agendado por IA: ${data.nextStep}`
            }
          });
        }
      }
      
      return {
        success: true,
        agentId: this.id,
        output: data,
        actions,
        confidence: 0.95,
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
        error: err?.message || "Erro desconhecido no resumo de encerramento",
      };
    }
  }
};
