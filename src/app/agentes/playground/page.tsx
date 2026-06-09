'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Zap,
  Play,
  Cpu,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  FileJson,
  Layers,
  Sparkles,
  RefreshCw,
  Terminal,
  HelpCircle,
  FileText
} from 'lucide-react';

const AGENT_EXAMPLES: Record<string, Array<{ label: string; text: string }>> = {
  triage: [
    { label: 'Problema Financeiro', text: 'Bom dia, gostaria de solicitar a segunda via do boleto do meu contrato pois venceu ontem e não recebi no e-mail.' },
    { label: 'Intenção de Compra', text: 'Olá, gostaria de saber os preços do plano Pro de vocês e se tem desconto para pagamento anual.' },
    { label: 'Suporte Técnico', text: 'Meu canal de WhatsApp desconectou sozinho do painel e não estou conseguindo ler o QR code de novo.' }
  ],
  sdr: [
    { label: 'Lead Quente (Imobiliária)', text: 'Preciso de um orçamento. Meu nome é Roberto, sou de São Paulo e temos 8 corretores para usar o CRM.' },
    { label: 'Dúvida de Preço', text: 'Quero saber os valores do sistema de vocês. Vocês atendem clínicas odontológicas?' },
    { label: 'Interesse Geral', text: 'Vi o anúncio de vocês sobre robôs de WhatsApp e queria entender como funciona na prática.' }
  ],
  summary: [
    { label: 'Negociação de Preço', text: 'Cliente: Olá, o plano pro está muito caro.\nAtendente: Podemos fazer 10% de desconto.\nCliente: Aceito, me envia o link de pagamento por favor.' },
    { label: 'Atendimento Resolvido', text: 'Cliente: Meu boleto venceu.\nAtendente: Enviei o PDF atualizado.\nCliente: Perfeito, acabei de pagar no PIX, obrigado pela agilidade!' },
    { label: 'Cancelamento em Risco', text: 'Cliente: Quero cancelar minha conta porque o suporte demorou demais para responder ontem e perdi vendas.' }
  ]
};

function PlaygroundContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Selected agent & provider state
  const [selectedAgent, setSelectedAgent] = useState<'triage' | 'sdr' | 'summary'>('triage');
  const [provider, setProvider] = useState<'openai' | 'groq'>('openai');
  
  // Input message state
  const [message, setMessage] = useState('');
  
  // Response states
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Set default message from selected agent examples
  useEffect(() => {
    const examples = AGENT_EXAMPLES[selectedAgent];
    if (examples && examples.length > 0) {
      setMessage(examples[0].text);
    }
  }, [selectedAgent]);

  // Read agent from query param if any
  useEffect(() => {
    const qAgent = searchParams.get('agent');
    if (qAgent && ['triage', 'sdr', 'summary'].includes(qAgent)) {
      setSelectedAgent(qAgent as any);
    }
  }, [searchParams]);

  const handleExecute = async () => {
    if (!message.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/playground/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent,
          message,
          provider
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar chamada de IA.');
      }

      setResponse(data);
    } catch (err: any) {
      setError(err?.message || 'Falha de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0b0c10] text-slate-100 font-sans min-h-screen relative selection:bg-primary selection:text-white pb-20">
      
      {/* Background Blurs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Floating Header */}
      <header className="sticky top-0 w-full z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-900 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-black text-white shadow shadow-primary/20">
              HB
            </div>
            <span className="font-extrabold text-sm text-white">
              HB<span className="text-primary">Flow</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <button onClick={() => router.push('/')} className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-none">
              <ArrowLeft size={12} /> Voltar ao Site
            </button>
            <span className="text-slate-700">|</span>
            <button onClick={() => router.push('/agentes')} className="hover:text-primary transition-colors cursor-pointer bg-transparent border-none">
              Equipe de IA
            </button>
            <button onClick={() => router.push('/agentes/analytics')} className="hover:text-primary transition-colors cursor-pointer bg-transparent border-none">
              Analytics de IA
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/login')}
              className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-primary/25 cursor-pointer"
            >
              Teste Grátis
            </button>
          </div>
        </div>
      </header>

      {/* Hero Intro */}
      <section className="pt-12 pb-6 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary mb-4 uppercase tracking-wider">
          <Terminal size={11} className="animate-pulse" />
          <span>Interactive AI Sandbox</span>
        </div>
        <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight">
          Playground de <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">Agentes de IA</span>
        </h1>
        <p className="text-slate-400 text-xs md:text-sm mt-3 max-w-xl mx-auto leading-relaxed font-medium">
          Teste os prompts, as saídas em JSON estruturado e veja as previsões dos agentes SDR, Triage e Summary simulados ou usando conexões reais com LLMs.
        </p>
      </section>

      {/* Playground Console Main Area */}
      <main className="px-6 max-w-7xl mx-auto mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Left Panel: Selection & Input */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-6">
            
            {/* Agent Selector */}
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider block mb-2.5">
                1. Selecione o Agente de IA
              </label>
              <div className="grid grid-cols-3 gap-2 bg-slate-900/40 p-1 rounded-2xl border border-slate-900">
                {[
                  { id: 'triage', label: 'Triage Agent', desc: 'Triagem de Setor' },
                  { id: 'sdr', label: 'SDR Agent', desc: 'Qualificação' },
                  { id: 'summary', label: 'Summary Agent', desc: 'Resumo / Sentiment' }
                ].map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => {
                      if (loading) return;
                      setSelectedAgent(agent.id as any);
                    }}
                    className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                      selectedAgent === agent.id
                        ? 'bg-primary text-white shadow shadow-primary/25'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                    }`}
                  >
                    <span className="text-[10.5px] font-bold">{agent.label}</span>
                    <span className={`text-[8px] mt-0.5 opacity-80 ${selectedAgent === agent.id ? 'text-white' : 'text-slate-500'}`}>{agent.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Provider Selector */}
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider block mb-2.5">
                2. LLM Provider (Com Fallback Local se sem chave no .env)
              </label>
              <div className="flex gap-4">
                {[
                  { id: 'openai', label: 'OpenAI gpt-4o-mini', badge: 'Recomendado' },
                  { id: 'groq', label: 'Groq llama3-70b', badge: 'Ultra-rápido' }
                ].map((item) => (
                  <label
                    key={item.id}
                    className={`flex-1 flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      provider === item.id
                        ? 'border-primary bg-primary/5 text-white shadow'
                        : 'border-slate-900 hover:border-slate-800 bg-slate-900/20 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="provider"
                        checked={provider === item.id}
                        onChange={() => setProvider(item.id as any)}
                        disabled={loading}
                        className="accent-primary"
                      />
                      <span className="text-xs font-bold">{item.label}</span>
                    </div>
                    <span className="text-[8px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-slate-500">{item.badge}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">
                  3. Mensagem Comercial de Entrada
                </label>
                <button
                  onClick={() => {
                    const examples = AGENT_EXAMPLES[selectedAgent];
                    const random = examples[Math.floor(Math.random() * examples.length)];
                    setMessage(random.text);
                  }}
                  disabled={loading}
                  className="text-[9px] font-bold text-primary hover:underline cursor-pointer bg-transparent border-none flex items-center gap-0.5"
                >
                  <RefreshCw size={10} /> Carregar outro exemplo
                </button>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={loading}
                rows={4}
                className="w-full bg-slate-900/40 border border-slate-850 hover:border-slate-800 focus:border-primary text-slate-100 rounded-2xl p-4 text-xs outline-none transition-all placeholder-slate-500 font-medium leading-relaxed resize-none"
                placeholder="Insira o texto que o cliente enviou no WhatsApp..."
              />
            </div>

            {/* Quick Helper Text */}
            <div className="bg-slate-900/35 border border-slate-900 rounded-2xl p-3 flex gap-2.5">
              <Bot size={16} className="text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 leading-normal">
                <strong>Modo Híbrido:</strong> O sistema detecta se existe chave de API no servidor. Se inexistente, utiliza regras de NLP na nossa camada local para devolver um JSON estruturado simulando a resposta do respectivo agente.
              </p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleExecute}
              disabled={loading || !message.trim()}
              className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-2xl font-bold text-xs transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Processando Inferência de IA...</span>
                </>
              ) : (
                <>
                  <Play size={12} fill="currentColor" />
                  <span>Executar Agente de IA</span>
                </>
              )}
            </button>
          </div>

          {/* Right Panel: JSON Console Output */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between h-full min-h-[500px]">
            
            {/* Header info */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider flex items-center gap-1.5">
                  <FileJson size={14} className="text-primary" />
                  Console de Resposta (JSON)
                </span>
                
                {response && (
                  <span className="text-[8px] font-mono font-bold bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded-full">
                    Inferência OK
                  </span>
                )}
              </div>

              {/* Console Body */}
              <div className="bg-[#050507] border border-slate-900 rounded-2xl p-4 font-mono text-[10.5px] leading-relaxed min-h-[320px] overflow-y-auto text-slate-300 relative shadow-inner">
                
                {/* Loader Overlay */}
                {loading && (
                  <div className="absolute inset-0 bg-[#050507]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                    <Cpu size={24} className="text-primary animate-spin" />
                    <span className="text-[10px] text-slate-400">Processando na nuvem...</span>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="text-rose-500 bg-rose-950/20 border border-rose-900/30 rounded-xl p-3.5 flex gap-2 font-sans">
                    <span className="text-xs">⚠️</span>
                    <div className="space-y-1">
                      <span className="font-bold text-[11px] block">Falha no Processamento:</span>
                      <span className="text-[10px] leading-normal">{error}</span>
                    </div>
                  </div>
                )}

                {/* Placeholder before running */}
                {!response && !error && !loading && (
                  <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center p-6 text-slate-500 font-sans gap-2">
                    <Bot size={36} className="text-slate-800" />
                    <span className="font-bold text-xs text-slate-400">Pronto para Execução</span>
                    <p className="text-[10px] max-w-[220px] leading-normal">Configure os parâmetros à esquerda e execute o agente para ver os metadados e o JSON gerado.</p>
                  </div>
                )}

                {/* Formatted JSON Output */}
                {response && !loading && (
                  <pre className="text-emerald-400 whitespace-pre-wrap">
                    {JSON.stringify(response.output, null, 2)}
                  </pre>
                )}
              </div>
            </div>

            {/* Performance Stats Footer */}
            {response && !loading && (
              <div className="mt-6 pt-4 border-t border-slate-900/70 grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-sans">
                <div className="bg-slate-900/30 p-2 rounded-xl border border-slate-900/60">
                  <span className="text-[8px] uppercase font-bold text-slate-500 block">Provedor</span>
                  <span className="text-[11px] font-extrabold text-white capitalize mt-0.5 block">{response.provider}</span>
                </div>
                <div className="bg-slate-900/30 p-2 rounded-xl border border-slate-900/60">
                  <span className="text-[8px] uppercase font-bold text-slate-500 block">Modelo Usado</span>
                  <span className="text-[11px] font-mono font-bold text-slate-300 mt-0.5 block truncate" title={response.model}>
                    {response.model}
                  </span>
                </div>
                <div className="bg-slate-900/30 p-2 rounded-xl border border-slate-900/60">
                  <span className="text-[8px] uppercase font-bold text-slate-500 block">Consumo de Tokens</span>
                  <span className="text-[11px] font-bold text-white mt-0.5 block">
                    {response.tokens?.input + response.tokens?.output || 0}
                  </span>
                </div>
                <div className="bg-slate-900/30 p-2 rounded-xl border border-slate-900/60">
                  <span className="text-[8px] uppercase font-bold text-slate-500 block">Custo Estimado</span>
                  <span className="text-[11px] font-mono font-bold text-emerald-400 mt-0.5 block">
                    ${(response.estimatedCost || 0).toFixed(5)}
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense fallback={
      <div className="bg-[#0b0c10] text-slate-100 font-sans min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw size={32} className="text-primary animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">Carregando playground...</p>
        </div>
      </div>
    }>
      <PlaygroundContent />
    </Suspense>
  );
}
