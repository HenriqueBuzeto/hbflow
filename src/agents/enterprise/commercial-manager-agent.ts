import { HBAgent, AgentPriority, AgentResult, AgentExecutionContext, AgentAction } from '../core/agent.types';
import { callAIProvider } from '../services/ai-provider.service';

export interface ManagerInput {
  tenantId: string;
}

export interface ManagerOutput {
  insights: string[];
  recommendedActions: string[];
}

export const commercialManagerAgent: HBAgent<ManagerInput, ManagerOutput> = {
  id: "commercial-manager-agent",
  name: "Gerente Comercial IA",
  description: "Analisa o funil de vendas, identifica gargalos comerciais e sugere remanejamentos de equipe.",
  plan: "enterprise",
  priority: AgentPriority.MEDIUM,
  enabled: true,
  triggers: ["deal.stage_changed", "manual.run"],
  
  async execute(input: ManagerInput, context: AgentExecutionContext): Promise<AgentResult<ManagerOutput>> {
    const start = Date.now();
    try {
      const prompt = `
Contexto do Gerente:
Empresa Tenant: ${input.tenantId}
Instruções:
Analise as métricas agregadas do pipeline de vendas, encontre negócios estagnados e gargalos operacionais.
Retorne exclusivamente o JSON correspondente.
`;

      const aiRes = await callAIProvider(prompt, "Você é o Gerente Comercial de IA da HBFlow.");
      const data: ManagerOutput = JSON.parse(aiRes.text);
      
      const actions: AgentAction[] = [];
      
      if (data.recommendedActions && data.recommendedActions.length > 0) {
        actions.push({
          type: "notify_role",
          role: "Supervisor",
          text: `📊 Insights do Gerente IA: ${data.insights[0] || 'Revisar pipeline'}`
        });
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
        error: err?.message || "Erro no gerente comercial",
      };
    }
  }
};
