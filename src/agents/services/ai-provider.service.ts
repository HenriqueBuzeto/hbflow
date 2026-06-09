import { calculateCost, estimateTokens } from '../core/agent-cost-tracker';

export interface AIProviderResult {
  text: string;
  confidence: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  provider: string;
  model: string;
}

export type LLMProvider = 'openai' | 'anthropic' | 'groq';

interface ProviderConfig {
  apiKey?: string;
  endpoint: string;
  model: string;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
}

const PROVIDERS: Record<LLMProvider, ProviderConfig> = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini', // Fallback model for operations
    inputCostPerMillion: 0.150, // USD per 1M tokens for gpt-4o-mini
    outputCostPerMillion: 0.600
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-sonnet-20241022',
    inputCostPerMillion: 3.000,
    outputCostPerMillion: 15.000
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama3-70b-8192',
    inputCostPerMillion: 0.590,
    outputCostPerMillion: 0.790
  }
};

/**
 * Invoca um provedor de IA real (OpenAI, Anthropic, Groq) com fallback seguro para simulação local.
 */
export const callAIProvider = async (
  prompt: string,
  systemInstruction = '',
  preferredProvider: LLMProvider = 'openai',
  customModel?: string
): Promise<AIProviderResult> => {
  const config = PROVIDERS[preferredProvider];
  const model = customModel || config.model;

  // Se a chave de API correspondente não estiver configurada, usa fallback de simulação local inteligente
  if (!config.apiKey) {
    return runSimulatedProvider(prompt, systemInstruction, preferredProvider, model);
  }

  const startTime = Date.now();
  try {
    let responseText = '';
    let inputTokens = 0;
    let outputTokens = 0;

    if (preferredProvider === 'openai' || preferredProvider === 'groq') {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' } // Ativa modo JSON estruturado
        })
      });

      if (!response.ok) {
        throw new Error(`AI Provider HTTP error ${response.status}: ${await response.text()}`);
      }

      const json = await response.json();
      responseText = json.choices?.[0]?.message?.content || '';
      inputTokens = json.usage?.prompt_tokens || estimateTokens(prompt + systemInstruction);
      outputTokens = json.usage?.completion_tokens || estimateTokens(responseText);
    } else if (preferredProvider === 'anthropic') {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 1024,
          system: systemInstruction,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic HTTP error ${response.status}: ${await response.text()}`);
      }

      const json = await response.json();
      responseText = json.content?.[0]?.text || '';
      inputTokens = json.usage?.input_tokens || estimateTokens(prompt + systemInstruction);
      outputTokens = json.usage?.output_tokens || estimateTokens(responseText);
    }

    // Calcula custo real baseando-se no modelo
    const estimatedCost = (inputTokens / 1_000_000) * config.inputCostPerMillion + 
                          (outputTokens / 1_000_000) * config.outputCostPerMillion;

    return {
      text: responseText,
      confidence: 0.95,
      inputTokens,
      outputTokens,
      estimatedCost,
      provider: preferredProvider,
      model
    };

  } catch (err: any) {
    console.warn(`[AI Provider: ${preferredProvider}] Falha na chamada da API real (${err?.message || err}). Usando fallback de simulação local.`);
    return runSimulatedProvider(prompt, systemInstruction, preferredProvider, model);
  }
};

/**
 * Método auxiliar de fallback para simular respostas estruturadas localmente.
 */
const runSimulatedProvider = async (
  prompt: string,
  systemInstruction: string,
  provider: string,
  model: string
): Promise<AIProviderResult> => {
  // Simula latência de rede/inferência
  await new Promise((resolve) => setTimeout(resolve, 250));

  const combined = systemInstruction + '\n' + prompt;
  const inputTokens = estimateTokens(combined);
  const lowerPrompt = prompt.toLowerCase();
  
  let responseText = "{}";
  let confidence = 0.85;

  if (lowerPrompt.includes('triagem') || lowerPrompt.includes('triage')) {
    if (lowerPrompt.includes('preço') || lowerPrompt.includes('orçamento') || lowerPrompt.includes('comprar')) {
      responseText = JSON.stringify({
        department: 'dept-vendas',
        intent: 'orcamento',
        confidence: 0.98,
        tags: ['vendas', 'lead-quente'],
        priority: 'high',
        shouldRoute: true,
        reason: 'Cliente solicitou preços de produtos comerciais.'
      });
      confidence = 0.98;
    } else if (lowerPrompt.includes('boleto') || lowerPrompt.includes('pagamento') || lowerPrompt.includes('financeiro')) {
      responseText = JSON.stringify({
        department: 'dept-financeiro',
        intent: 'faturamento',
        confidence: 0.95,
        tags: ['financeiro', 'cobranca'],
        priority: 'medium',
        shouldRoute: true,
        reason: 'Cliente solicitou boleto ou suporte de faturamento.'
      });
      confidence = 0.95;
    } else {
      responseText = JSON.stringify({
        department: 'dept-manutencao',
        intent: 'suporte',
        confidence: 0.92,
        tags: ['manutencao'],
        priority: 'medium',
        shouldRoute: true,
        reason: 'Triagem identificou ticket de suporte técnico/conserto.'
      });
      confidence = 0.92;
    }
  } else if (lowerPrompt.includes('faq')) {
    if (lowerPrompt.includes('horário') || lowerPrompt.includes('funcionamento')) {
      responseText = JSON.stringify({
        canAnswer: true,
        confidence: 0.96,
        answer: "Nosso horário de funcionamento é de segunda a sexta-feira, das 09h às 18h, e aos sábados das 09h às 13h.",
        sources: ['kb_funcionamento_v1'],
        shouldSendAutomatically: true
      });
      confidence = 0.96;
    } else if (lowerPrompt.includes('pix') || lowerPrompt.includes('pagamento')) {
      responseText = JSON.stringify({
        canAnswer: true,
        confidence: 0.93,
        answer: "Aceitamos pagamentos via PIX (chave CNPJ: 12.345.678/0001-99) ou link de checkout parcelado em até 10x sem juros.",
        sources: ['kb_pagamentos_v3'],
        shouldSendAutomatically: true
      });
      confidence = 0.93;
    } else {
      responseText = JSON.stringify({
        canAnswer: false,
        confidence: 0.40,
        answer: "Desculpe, não encontrei uma resposta definitiva na base de conhecimento. Encaminhando ao suporte humano.",
        sources: [],
        shouldSendAutomatically: false
      });
      confidence = 0.40;
    }
  } else if (lowerPrompt.includes('sdr')) {
    responseText = JSON.stringify({
      leadScore: 85,
      temperature: 'quente',
      qualificationStatus: 'qualified',
      missingFields: ['budget'],
      shouldCreateDeal: true,
      suggestedPipelineStage: 'stage-1',
      suggestedMessage: 'Perfeito! Vejo que você está buscando um modelo Ray-Ban. Você já possui um orçamento planejado para este óculos?'
    });
    confidence = 0.89;
  } else if (lowerPrompt.includes('resumo') || lowerPrompt.includes('summary')) {
    responseText = JSON.stringify({
      summary: 'Cliente solicitou cotação de óculos Ray-Ban clássico preto e consultou formas de pagamento.',
      outcome: 'proposta_enviada',
      nextStep: 'Realizar follow-up em 3 dias sobre o link de pagamento.',
      sentiment: 'positive',
      recommendedTasks: [
        { title: 'Enviar link de pagamento PIX no WhatsApp', dueInDays: 3 }
      ]
    });
    confidence = 0.94;
  } else if (lowerPrompt.includes('sentiment') || lowerPrompt.includes('sentimento')) {
    if (lowerPrompt.includes('irritado') || lowerPrompt.includes('reclamar') || lowerPrompt.includes('cancelar') || lowerPrompt.includes('ruim')) {
      responseText = JSON.stringify({
        sentiment: 'angry',
        riskLevel: 'critical',
        confidence: 0.98,
        reason: 'Cliente insatisfeito demonstrando irritação ou reclamando.',
        recommendedAction: 'escalate_supervisor'
      });
      confidence = 0.98;
    } else {
      responseText = JSON.stringify({
        sentiment: 'positive',
        riskLevel: 'low',
        confidence: 0.88,
        reason: 'Cliente respondeu de maneira cordial e tom cooperativo.',
        recommendedAction: 'continue_normal'
      });
      confidence = 0.88;
    }
  } else if (lowerPrompt.includes('comercial') || lowerPrompt.includes('sales')) {
    responseText = JSON.stringify({
      suggestedReply: "Compreendo perfeitamente sua preocupação comercial. Gostaria de ver nossa opção Ray-Ban mais econômica com o mesmo nível de garantia?",
      objectionDetected: "price",
      salesStageSuggestion: "stage-3",
      shouldEscalateToHuman: false
    });
    confidence = 0.92;
  } else if (lowerPrompt.includes('cobrança') || lowerPrompt.includes('billing')) {
    responseText = JSON.stringify({
      billingStatus: "overdue",
      message: "Olá! Identificamos um atraso na sua fatura da HBFlow vencida em 05/06/2026. Segue a chave PIX para regularização: 12.345.678/0001-99.",
      shouldSendPaymentLink: true,
      shouldRouteToFinance: false
    });
    confidence = 0.95;
  } else if (lowerPrompt.includes('supervisor')) {
    responseText = JSON.stringify({
      alertType: "sla_warning",
      severity: "high",
      message: "Alerta: O cliente aguarda resposta há mais de 10 minutos na fila do financeiro.",
      recommendedAction: "notify_supervisor",
      targetUserId: "user-3"
    });
    confidence = 0.96;
  } else if (lowerPrompt.includes('forecast')) {
    responseText = JSON.stringify({
      forecastMonth: "2026-06",
      expectedRevenue: 154200.00,
      bestCase: 198000.00,
      worstCase: 110000.00,
      confidence: 0.84,
      risks: ["Existem 12 negócios congelados sem interações na etapa de negociação."]
    });
    confidence = 0.91;
  } else if (lowerPrompt.includes('audit')) {
    responseText = JSON.stringify({
      riskLevel: "low",
      event: "login",
      description: "Auditoria detectou login normal efetuado pelo administrador.",
      shouldNotifyAdmin: false
    });
    confidence = 0.99;
  } else if (lowerPrompt.includes('workflow')) {
    responseText = JSON.stringify({
      workflowTriggered: "Lead Triage Sequence",
      workflowId: "flow-auto-1",
      executionSuccess: true,
      actionsExecuted: ["apply_tag", "route_to_department"],
      logs: ["Triado como vendas", "Encaminhado para a fila comercial"]
    });
    confidence = 0.97;
  } else if (lowerPrompt.includes('coach')) {
    responseText = JSON.stringify({
      userId: "user-1",
      score: 88,
      strengths: ["Uso adequado de respostas rápidas", "Agilidade"],
      improvements: ["Oferecer alternativas antes de contornar preço de forma agressiva"],
      coachingTips: ["Experimente perguntar se o cliente tem receita médica antes de propor descontos."]
    });
    confidence = 0.93;
  } else if (lowerPrompt.includes('copilot')) {
    responseText = JSON.stringify({
      suggestions: [
        { type: "reply", text: "Olá! Fico feliz em ajudar. Qual o seu grau prescrito para as lentes?", confidence: 0.91 }
      ],
      nextBestAction: "ask_prescription"
    });
    confidence = 0.91;
  } else if (lowerPrompt.includes('manager')) {
    responseText = JSON.stringify({
      insights: [
        "Identificado pico de chamados na Manutenção (Luiza Souza).",
        "A taxa de conversão comercial está em 90% para o agente João Silva."
      ],
      recommendedActions: [
        "Remanejar Pedro Santos da manutenção para auxiliar na triagem comercial.",
        "Enviar follow-up nas propostas Ray-Ban vencendo amanhã."
      ]
    });
    confidence = 0.95;
  } else if (lowerPrompt.includes('followup')) {
    responseText = JSON.stringify({
      shouldSend: true,
      message: "Olá! Gostaria de saber se conseguiu avaliar o orçamento que te enviamos ontem?",
      channel: "whatsapp",
      templateRequired: false,
      nextFollowUpInDays: 3
    });
    confidence = 0.94;
  } else {
    // Default mock response formatted as standard JSON
    responseText = JSON.stringify({
      message: "Simulação HBFlow AI",
      success: true,
      data: lowerPrompt
    });
  }

  const outputTokens = estimateTokens(responseText);
  const cost = calculateCost(inputTokens, outputTokens);

  return {
    text: responseText,
    confidence,
    inputTokens,
    outputTokens,
    estimatedCost: cost.estimatedCost,
    provider,
    model
  };
};
