'use client';

import React, { useState, use } from 'react';
import { useStore } from '@/store/useStore';
import { agentRegistry } from '@/agents/core/agent-registry';
import { isAgentAllowedForPlan, getPlanMinRequirementLabel } from '@/agents/core/agent-permissions';
import { ArrowLeft, Bot, Play, CheckCircle2, AlertTriangle, ShieldAlert, Clock, Cpu, FileText, Send, Zap } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ agentId: string }>;
}

export default function AgentDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const agentId = resolvedParams.agentId;

  const {
    tenants,
    currentTenantId,
    enabledAgentIds,
    toggleAgent,
    agentLogs,
    runAgentManually
  } = useStore();

  const agent = agentRegistry.find((a) => a.id === agentId);
  const activeTenant = tenants.find((t) => t.id === currentTenantId) || tenants[0] || { id: '', name: 'Empresa', slug: '', plan: 'starter' };
  const tenantPlan = (activeTenant?.plan || 'starter') as any;

  // Playground states
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  if (!agent) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md mx-auto space-y-4">
        <Bot className="text-rose-500 mx-auto" size={40} />
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Agente não encontrado</h2>
        <p className="text-xs text-slate-500">O identificador de agente solicitado não está registrado na camada base do HBFlow.</p>
        <Link href="/dashboard/agentes" className="text-xs font-bold text-primary hover:underline block">Voltar ao Catálogo</Link>
      </div>
    );
  }

  const isAllowed = isAgentAllowedForPlan(agent.plan, tenantPlan);
  const isEnabled = enabledAgentIds.includes(agent.id) && isAllowed;

  // Filter logs for this specific agent
  const logs = agentLogs.filter((l) => l.agentId === agent.id);

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim()) return;

    setTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      // Build dynamic input payload based on agent type
      let payload: any = { messageBody: testInput };
      if (agent.id === 'summary-agent') {
        payload = { conversationId: 'conv-1' }; // Simulation fallback
      } else if (agent.id === 'followup-agent') {
        payload = { contactId: 'contact-1', dealId: 'deal-1' };
      } else if (agent.id === 'billing-agent') {
        payload = { contactId: 'contact-1' };
      } else if (agent.id === 'forecast-agent' || agent.id === 'commercial-manager-agent') {
        payload = { tenantId: currentTenantId };
      } else if (agent.id === 'audit-agent') {
        payload = { event: 'manual_run', userId: 'user-1', description: testInput };
      } else if (agent.id === 'workflow-agent') {
        payload = { eventName: 'message.received', payload: { body: testInput } };
      }

      const res = await runAgentManually(agent.id, payload);
      setTestResult(res);
    } catch (err: any) {
      setTestError(err?.message || 'Erro inesperado na execução');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-200">
      
      {/* Back Link */}
      <Link href="/dashboard/agentes" className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors w-fit">
        <ArrowLeft size={14} />
        <span>Voltar ao catálogo</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Config Cards */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Agent Meta Info */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 relative overflow-hidden">
            {!isAllowed && (
              <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-950/60 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center p-6 text-center">
                <ShieldAlert size={24} className="text-yellow-500 mb-2" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Upgrade Necessário</h4>
                <p className="text-[10px] text-slate-500 mt-0.5 max-w-[180px]">Disponível apenas no plano comercial {getPlanMinRequirementLabel(agent.plan)}.</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl border dark:border-slate-800">
                <Bot size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{agent.name}</h2>
                <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border dark:border-slate-800 px-2 py-0.5 rounded-full font-bold uppercase block mt-1 w-fit">
                  {agent.plan}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {agent.description}
            </p>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-between items-center">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200">Status Ativo</div>
              <button
                onClick={() => toggleAgent(agent.id)}
                disabled={!isAllowed}
                className="relative w-9 h-5 rounded-full transition-colors cursor-pointer outline-none bg-slate-300 dark:bg-slate-700"
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                  isEnabled ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Trigger settings info */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 border-b pb-2 flex items-center gap-1.5">
              <Zap size={14} className="text-primary" />
              Eventos Gatilhos (Triggers)
            </h3>
            <div className="space-y-1.5">
              {agent.triggers.map((trigger) => (
                <div key={trigger} className="text-[10px] font-mono bg-slate-50 dark:bg-slate-800/40 border dark:border-slate-800 p-2 rounded-lg text-slate-600 dark:text-slate-400">
                  ⚡ {trigger}
                </div>
              ))}
            </div>
          </div>

          {/* System Prompt details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 border-b pb-2 flex items-center gap-1.5">
              <FileText size={14} className="text-primary" />
              Prompt de Instrução Base
            </h3>
            <div className="bg-slate-50 dark:bg-slate-800/20 border dark:border-slate-800 rounded-xl p-3 text-[10.5px] text-slate-500 font-mono leading-relaxed whitespace-pre-wrap">
              {agent.id === 'triage-agent' ? 'Analise a mensagem de entrada do cliente e decida o melhor departamento...' :
               agent.id === 'faq-agent' ? 'Responda perguntas simples baseando-se na base de conhecimento...' :
               agent.id === 'sdr-agent' ? 'Você é a SDR IA do time. Qualifique leads coletando interesse...' :
               'Você atua como assistente inteligente otimizando tarefas no SaaS...'}
            </div>
          </div>

        </div>

        {/* Right Columns: Playground and Logs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Playground / Manual Run Area */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-850 dark:text-slate-100 border-b pb-2 flex items-center gap-1.5">
              <Play size={14} className="text-primary" />
              Playground de Teste Manual do Agente
            </h3>

            <form onSubmit={handleTest} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Texto de Entrada / Simulação de Chat
                </label>
                <textarea
                  rows={3}
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Ex: Quanto custa o óculos de grau clássico Rayban?"
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs outline-none focus:border-primary text-slate-700 dark:text-slate-200"
                />
              </div>

              <button
                type="submit"
                disabled={testing || !testInput.trim()}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2.5 px-6 rounded-xl transition-all shadow-md shadow-primary/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Send size={13} />
                <span>{testing ? 'Executando...' : 'Testar Agente'}</span>
              </button>
            </form>

            {/* Test outcomes */}
            {testError && (
              <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-200 dark:border-rose-900/40 p-4 rounded-2xl text-xs font-medium flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>{testError}</p>
              </div>
            )}

            {testResult && (
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/30 border dark:border-slate-800 rounded-2xl animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b dark:border-slate-800 pb-2">
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Resultado da Execução</span>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span>Confiança: {Math.round((testResult.confidence || 0.9) * 100)}%</span>
                    <span>• Cost: ${testResult.cost?.estimatedCost.toFixed(5)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">JSON Output</span>
                    <pre className="bg-slate-900 text-slate-100 rounded-xl p-3 text-[10px] font-mono overflow-x-auto max-h-56 scrollbar-thin">
                      {JSON.stringify(testResult.output || {}, null, 2)}
                    </pre>
                  </div>

                  {testResult.actions && testResult.actions.length > 0 && (
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Ações Disparadas</span>
                      <div className="space-y-1">
                        {testResult.actions.map((action: any, idx: number) => (
                          <div key={idx} className="text-[10.5px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 p-2 rounded-xl flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
                            <span>Ação do tipo &quot;{action.type}&quot; registrada no core.</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Logs Audit History */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-850 dark:text-slate-100 border-b pb-2 flex items-center gap-1.5">
              <Clock size={14} className="text-primary" />
              Histórico de Execuções e Auditoria (Logs)
            </h3>

            <div className="space-y-2.5 max-h-96 overflow-y-auto scrollbar-thin">
              {logs.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">Este agente ainda não possui execuções registradas neste tenant.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="p-3 border dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 transition-colors text-xs flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-slate-800 dark:text-slate-200">Gatilho: {log.trigger}</strong>
                        <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded ${
                          log.success ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                        }`}>
                          {log.success ? 'Sucesso' : 'Falha'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-550 mt-1 block font-mono">
                        {new Date(log.createdAt).toLocaleString()} • Duração: {log.durationMs}ms
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 block font-mono">
                        Cost: ${log.cost.toFixed(5)}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Confiança: {Math.round(log.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
