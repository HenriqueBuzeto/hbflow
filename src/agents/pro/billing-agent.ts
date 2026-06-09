import { HBAgent, AgentPriority, AgentResult, AgentExecutionContext, AgentAction } from '../core/agent.types';
import { callAIProvider } from '../services/ai-provider.service';

export interface BillingInput {
  contactId: string;
}

export interface BillingOutput {
  billingStatus: "pending" | "overdue" | "settled";
  message: string;
  shouldSendPaymentLink: boolean;
  shouldRouteToFinance: boolean;
}

export const billingAgent: HBAgent<BillingInput, BillingOutput> = {
  id: "billing-agent",
  name: "Agente de Cobrança",
  description: "Envia avisos financeiros, boletos e realiza negociações amigáveis de faturas em atraso.",
  plan: "pro",
  priority: AgentPriority.HIGH,
  enabled: true,
  triggers: ["task.due"],
  
  async execute(input: BillingInput, context: AgentExecutionContext): Promise<AgentResult<BillingOutput>> {
    const start = Date.now();
    try {
      const contact = context.state.getContact(input.contactId);
      
      const prompt = `
Fatura em atraso para o contato:
Cliente: ${contact?.name || 'Cliente'}
Telefone: ${contact?.phone || 'Indefinido'}
Etiquetas: ${contact?.tags?.join(', ') || 'Nenhuma'}

Instruções:
Crie uma mensagem cordial lembrando o cliente do débito e oferecendo regularização via PIX.
Retorne exclusivamente o JSON correspondente.
`;

      const aiRes = await callAIProvider(prompt, "Você é o Agente Financeiro de Cobranças da HBFlow.");
      const data: BillingOutput = JSON.parse(aiRes.text);
      
      const actions: AgentAction[] = [];
      
      if (data.message) {
        actions.push({
          type: "send_message",
          text: data.message,
          requireApproval: true // Cobrança exige aprovação antes de enviar ao cliente
        });
      }
      
      if (data.shouldRouteToFinance) {
        actions.push({ type: "route_to_department", departmentId: "dept-financeiro" });
      }
      
      if (data.billingStatus === 'overdue') {
        actions.push({ type: "apply_tag", tag: "cobrança-atraso" });
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
        error: err?.message || "Erro desconhecido na cobrança",
      };
    }
  }
};
