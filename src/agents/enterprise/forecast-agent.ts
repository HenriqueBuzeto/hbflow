import { HBAgent, AgentPriority, AgentResult, AgentExecutionContext } from '../core/agent.types';
import { callAIProvider } from '../services/ai-provider.service';

export interface ForecastInput {
  tenantId: string;
}

export interface ForecastOutput {
  forecastMonth: string;
  expectedRevenue: number;
  bestCase: number;
  worstCase: number;
  confidence: number;
  risks: string[];
}

export const forecastAgent: HBAgent<ForecastInput, ForecastOutput> = {
  id: "forecast-agent",
  name: "Agente de Forecast",
  description: "Preve faturamento e volume de vendas futuro cruzando probabilidades de fechamento de negócios.",
  plan: "enterprise",
  priority: AgentPriority.MEDIUM,
  enabled: true,
  triggers: ["deal.stage_changed", "manual.run"],
  
  async execute(input: ForecastInput, context: AgentExecutionContext): Promise<AgentResult<ForecastOutput>> {
    const start = Date.now();
    try {
      const prompt = `
Previsão de Receita (Forecast):
Empresa Tenant: ${input.tenantId}

Instruções:
Estime o faturamento esperado do mês atual com base nas probabilidades de conversão e etapas vigentes.
Retorne exclusivamente o JSON correspondente.
`;

      const aiRes = await callAIProvider(prompt, "Você é o Analista de Previsões Financeiras de Vendas (Forecast) IA.");
      const data: ForecastOutput = JSON.parse(aiRes.text);
      
      return {
        success: true,
        agentId: this.id,
        output: data,
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
        error: err?.message || "Erro no forecast",
      };
    }
  }
};
