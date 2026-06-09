import { HBAgent, AgentPriority, AgentResult, AgentExecutionContext, AgentAction } from '../core/agent.types';
import { callAIProvider } from '../services/ai-provider.service';
import { getConversationHistoryPrompt } from '../core/agent-memory';

export interface SDRInput {
  conversationId: string;
}

export interface SDROutput {
  leadScore: number;
  temperature: "hot" | "morno" | "frio";
  qualificationStatus: "qualified" | "unqualified" | "nurturing";
  missingFields: string[];
  shouldCreateDeal: boolean;
  suggestedPipelineStage?: string;
  suggestedMessage: string;
}

export const sdrAgent: HBAgent<SDRInput, SDROutput> = {
  id: "sdr-agent",
  name: "SDR IA",
  description: "Qualifica leads automaticamente coletando interesse, orçamento e urgência.",
  plan: "pro",
  priority: AgentPriority.HIGH,
  enabled: true,
  triggers: ["conversation.created", "message.received"],
  
  async execute(input: SDRInput, context: AgentExecutionContext): Promise<AgentResult<SDROutput>> {
    const start = Date.now();
    try {
      const messages = context.state.getMessages(input.conversationId);
      const historyText = getConversationHistoryPrompt(messages);
      const contact = context.state.getContact(context.contactId || '');
      
      const prompt = `
Histórico de Conversa do Lead:
${historyText}

Perfil do Contato:
Cidade/Região: ${contact?.city || 'Desconhecida'}
Etiquetas: ${contact?.tags?.join(', ') || 'Nenhuma'}

Instruções:
Avalie se este lead está interessado em comprar, qualifique-o de 0 a 100 e decida se devemos criar um negócio comercial no pipeline.
Retorne exclusivamente o JSON correspondente.
`;

      const aiRes = await callAIProvider(prompt, "Você é a SDR IA do time HBFlow.");
      const data: SDROutput = JSON.parse(aiRes.text);
      
      const actions: AgentAction[] = [];
      
      // Update Lead Score
      actions.push({ type: "update_contact_score", score: data.leadScore - (contact?.score || 40) });
      
      // Apply tags based on temperature
      if (data.temperature === 'hot') {
        actions.push({ type: "apply_tag", tag: "lead-quente" });
      } else if (data.temperature === 'morno') {
        actions.push({ type: "apply_tag", tag: "lead-morno" });
      }
      
      // Create opportunity deal in Pipeline
      if (data.shouldCreateDeal && context.contactId) {
        actions.push({
          type: "create_deal",
          payload: {
            title: `Oportunidade - ${contact?.name || 'Cliente'}`,
            value: data.temperature === 'hot' ? 1200.00 : 450.00,
            products: "Óculos de Grau / Lentes"
          }
        });
      }
      
      // Suggest followup task
      actions.push({
        type: "create_task",
        payload: {
          title: `Follow-up comercial SDR - ${contact?.name || 'Lead'}`,
          dueInDays: 2,
          priority: data.temperature === 'hot' ? 'high' : 'medium',
          notes: `Lead triado com Score: ${data.leadScore} (${data.temperature}).`
        }
      });
      
      return {
        success: true,
        agentId: this.id,
        output: data,
        actions,
        confidence: 0.90,
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
        error: err?.message || "Erro desconhecido na SDR",
      };
    }
  }
};
