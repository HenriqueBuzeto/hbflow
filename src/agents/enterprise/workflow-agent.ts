import { HBAgent, AgentPriority, AgentResult, AgentExecutionContext } from '../core/agent.types';
import { callAIProvider } from '../services/ai-provider.service';

export interface WorkflowInput {
  eventName: string;
  payload: any;
}

export interface WorkflowOutput {
  workflowTriggered: string;
  workflowId: string;
  executionSuccess: boolean;
  actionsExecuted: string[];
  logs: string[];
}

export const workflowAgent: HBAgent<WorkflowInput, WorkflowOutput> = {
  id: "workflow-agent",
  name: "Agente de Workflow",
  description: "Cria pontes de automação cruzadas executando rotinas automáticas de webhook a tarefas.",
  plan: "enterprise",
  priority: AgentPriority.CRITICAL,
  enabled: true,
  triggers: ["campaign.completed", "conversation.closed"],
  
  async execute(input: WorkflowInput, context: AgentExecutionContext): Promise<AgentResult<WorkflowOutput>> {
    const start = Date.now();
    try {
      const prompt = `
Orquestração de Workflow:
Evento disparador: ${input.eventName}
Payload: ${JSON.stringify(input.payload)}

Instruções:
Determine se este evento aciona um workflow corporativo no tenant. 
Descreva as ações que seriam executadas.
Retorne exclusivamente o JSON correspondente.
`;

      const aiRes = await callAIProvider(prompt, "Você é o Agente Motor de Workflows Autônomos IA.");
      const data: WorkflowOutput = JSON.parse(aiRes.text);
      
      return {
        success: true,
        agentId: this.id,
        output: data,
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
        error: err?.message || "Erro no executor de workflows",
      };
    }
  }
};
