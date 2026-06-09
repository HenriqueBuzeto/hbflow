import { HBAgent, AgentPriority, AgentResult, AgentExecutionContext, AgentAction } from '../core/agent.types';
import { callAIProvider } from '../services/ai-provider.service';

export interface AuditInput {
  event: string;
  userId: string;
  description: string;
}

export interface AuditOutput {
  riskLevel: "low" | "medium" | "high" | "critical";
  event: string;
  description: string;
  shouldNotifyAdmin: boolean;
}

export const auditAgent: HBAgent<AuditInput, AuditOutput> = {
  id: "audit-agent",
  name: "Agente de Auditoria",
  description: "Monitora ações críticas dos atendentes (logins, exclusões, chaves de API) para auditoria e compliance.",
  plan: "enterprise",
  priority: AgentPriority.CRITICAL,
  enabled: true,
  triggers: ["manual.run"], // Triggered dynamically by security hooks
  
  async execute(input: AuditInput, context: AgentExecutionContext): Promise<AgentResult<AuditOutput>> {
    const start = Date.now();
    try {
      const prompt = `
Log de Auditoria:
Evento: ${input.event}
Usuário: ${input.userId}
Detalhes: ${input.description}

Instruções:
Avalie se este evento viola políticas de segurança ou compliance. Estime a severidade do risco.
Retorne exclusivamente o JSON correspondente.
`;

      const aiRes = await callAIProvider(prompt, "Você é o Inspetor IA de Auditoria e Compliance.");
      const data: AuditOutput = JSON.parse(aiRes.text);
      
      const actions: AgentAction[] = [];
      
      if (data.shouldNotifyAdmin) {
        actions.push({
          type: "notify_role",
          role: "Admin",
          text: `🚨 RISCO DE COMPLIANCE (${data.riskLevel.toUpperCase()}): ${data.description}`
        });
      }
      
      return {
        success: true,
        agentId: this.id,
        output: data,
        actions,
        confidence: 0.99,
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
        error: err?.message || "Erro na auditoria",
      };
    }
  }
};
