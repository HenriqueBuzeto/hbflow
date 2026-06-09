import { HBAgent, AgentPriority, AgentResult, AgentExecutionContext, AgentAction } from '../core/agent.types';
import { callAIProvider } from '../services/ai-provider.service';
import { TRIAGE_PROMPT } from '../prompts/triage-prompts';

export interface TriageInput {
  messageBody: string;
}

export interface TriageOutput {
  department: string | null;
  intent: string;
  confidence: number;
  tags: string[];
  priority: "low" | "medium" | "high" | "critical";
  shouldRoute: boolean;
  suggestedUserId?: string;
  reason: string;
}

export const triageAgent: HBAgent<TriageInput, TriageOutput> = {
  id: "triage-agent",
  name: "Agente de Triagem Inteligente",
  description: "Classifica e direciona a primeira conversa do cliente para o setor adequado.",
  plan: "starter",
  priority: AgentPriority.CRITICAL,
  enabled: true,
  triggers: ["conversation.created", "message.received"],
  
  async execute(input: TriageInput, context: AgentExecutionContext): Promise<AgentResult<TriageOutput>> {
    const start = Date.now();
    try {
      const activeDepts = context.state.getDepartments().map(d => `${d.id} (${d.name})`).join(', ');
      
      const prompt = `
Contexto de Triagem:
Mensagem do Cliente: "${input.messageBody}"
Setores ativos na plataforma: ${activeDepts}

Instruções:
${TRIAGE_PROMPT}
Retorne exclusivamente um objeto JSON correspondendo ao schema de triagem.
`;

      const aiRes = await callAIProvider(prompt, "Você é o Agente de Triagem.");
      const data: TriageOutput = JSON.parse(aiRes.text);
      
      const actions: AgentAction[] = [];
      
      if (data.shouldRoute && data.department) {
        actions.push({ type: "route_to_department", departmentId: data.department });
      }
      
      if (data.tags && data.tags.length > 0) {
        for (const tag of data.tags) {
          actions.push({ type: "apply_tag", tag });
        }
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
        error: err?.message || "Erro desconhecido na triagem",
      };
    }
  }
};
