import { HBAgent, AgentPriority, AgentResult, AgentExecutionContext, AgentAction } from '../core/agent.types';
import { callAIProvider } from '../services/ai-provider.service';
import { queryKnowledgeBase } from '../services/knowledge-base.service';

export interface FAQInput {
  messageBody: string;
}

export interface FAQOutput {
  canAnswer: boolean;
  confidence: number;
  answer: string;
  sources: string[];
  shouldSendAutomatically: boolean;
}

export const faqAgent: HBAgent<FAQInput, FAQOutput> = {
  id: "faq-agent",
  name: "Agente de FAQ",
  description: "Responde de forma autônoma perguntas frequentes do cliente baseando-se na base de conhecimento.",
  plan: "starter",
  priority: AgentPriority.LOW,
  enabled: true,
  triggers: ["message.received"],
  
  async execute(input: FAQInput, context: AgentExecutionContext): Promise<AgentResult<FAQOutput>> {
    const start = Date.now();
    try {
      const kbDocs = await queryKnowledgeBase(input.messageBody);
      
      const prompt = `
Pergunta do Cliente: "${input.messageBody}"
Documentos de conhecimento recuperados:
${kbDocs.map((doc, idx) => `[${idx}] ${doc}`).join('\n')}

Instruções:
Decida se é possível responder de forma confiável à pergunta do cliente usando Apenas as informações fornecidas acima.
Se a confiança for > 85%, retorne canAnswer: true com a resposta correspondente.
Se a confiança for baixa, defina canAnswer: false.
Retorne exclusivamente o JSON correspondente.
`;

      const aiRes = await callAIProvider(prompt, "Você é o Agente de FAQ da HBFlow.");
      const data: FAQOutput = JSON.parse(aiRes.text);
      
      const actions: AgentAction[] = [];
      
      if (data.canAnswer && data.shouldSendAutomatically && data.answer) {
        actions.push({
          type: "send_message",
          text: data.answer,
          requireApproval: data.confidence < 0.90 // Require approval if confidence is borderline
        });
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
        error: err?.message || "Erro desconhecido no FAQ",
      };
    }
  }
};
