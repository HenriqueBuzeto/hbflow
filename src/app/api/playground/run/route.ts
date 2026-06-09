import { NextRequest, NextResponse } from 'next/server';
import { callAIProvider, LLMProvider } from '@/agents/services/ai-provider.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, message, provider = 'openai' } = body;

    if (!agentId || !message) {
      return NextResponse.json(
        { error: 'Parâmetros agentId e message são obrigatórios.' },
        { status: 400 }
      );
    }

    let systemInstruction = '';
    let prompt = '';

    // Set up prompt templates to trigger correct fallback tags in ai-provider.service.ts
    switch (agentId) {
      case 'triage':
        systemInstruction = 'Você é o Triage Agent do HBFlow, responsável por classificar a intenção e encaminhar para o setor correto. Retorne APENAS um objeto JSON com os campos: department, intent, confidence, tags (array de strings), priority (low/medium/high), shouldRoute (boolean), reason (breve justificativa).';
        prompt = `Faça a triagem desta mensagem comercial do WhatsApp: "${message}"`;
        break;
      case 'sdr':
        systemInstruction = 'Você é o SDR Agent do HBFlow, responsável por qualificar leads que buscam atendimento comercial. Retorne APENAS um objeto JSON contendo os campos: leadScore (número de 0 a 100), temperature (frio/morno/quente), qualificationStatus (qualified/unqualified), missingFields (array de campos pendentes de coleta), shouldCreateDeal (boolean), suggestedPipelineStage (stage-1), suggestedMessage (sugestão de resposta em português).';
        prompt = `Qualifique o lead baseado neste diálogo no WhatsApp (SDR): "${message}"`;
        break;
      case 'summary':
        systemInstruction = 'Você é o Summary Agent do HBFlow, encarregado de resumir a conversa e propor ações futuras. Retorne APENAS um objeto JSON com os campos: summary (resumo em uma frase), outcome (resolvido, aguardando_cliente, negociando), nextStep (próxima ação recomendada), sentiment (positive/neutral/negative), recommendedTasks (array de objetos com title e dueInDays).';
        prompt = `Gere o resumo e análise de sentimento desta conversa (summary): "${message}"`;
        break;
      default:
        systemInstruction = 'Você é o Assistente HBFlow. Retorne um JSON padrão de simulação.';
        prompt = `Processamento geral: "${message}"`;
    }

    // Call provider
    const result = await callAIProvider(prompt, systemInstruction, provider as LLMProvider);

    // Try to parse the text as JSON, or return raw text if parsing fails
    let jsonOutput = null;
    try {
      jsonOutput = JSON.parse(result.text);
    } catch (parseErr) {
      // If LLM returned text wrapped in ```json ... ```, strip it
      let cleanedText = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      try {
        jsonOutput = JSON.parse(cleanedText);
      } catch (e) {
        jsonOutput = { rawResponse: result.text };
      }
    }

    return NextResponse.json({
      success: true,
      agentId,
      provider: result.provider,
      model: result.model,
      confidence: result.confidence,
      tokens: {
        input: result.inputTokens,
        output: result.outputTokens,
      },
      estimatedCost: result.estimatedCost,
      output: jsonOutput
    });

  } catch (err: any) {
    console.error('Playground API Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro interno de processamento.' },
      { status: 500 }
    );
  }
}
