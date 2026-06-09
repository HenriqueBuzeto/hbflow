'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { agentRegistry } from '@/agents/core/agent-registry';
import { isAgentAllowedForPlan, getPlanMinRequirementLabel } from '@/agents/core/agent-permissions';
import { Sparkles, Bot, ShieldAlert, Cpu, Check, X, Search, DollarSign, Layers, ArrowUpRight, Play } from 'lucide-react';
import Link from 'next/link';

export default function AgentesPage() {
  const {
    tenants,
    currentTenantId,
    enabledAgentIds,
    toggleAgent,
    agentLogs,
    clearAgentLogs
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<'all' | 'starter' | 'pro' | 'enterprise'>('all');

  const activeTenant = tenants.find((t) => t.id === currentTenantId) || tenants[0];
  const tenantPlan = (activeTenant?.plan || 'starter') as any;

  // Grouped stats
  const totalExecutions = agentLogs.length;
  const totalCost = agentLogs.reduce((sum, log) => sum + log.cost, 0);
  const successRate = totalExecutions > 0 
    ? Math.round((agentLogs.filter((l) => l.success).length / totalExecutions) * 100) 
    : 100;

  // Filters agents
  const filteredAgents = agentRegistry.filter((agent) => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = filterPlan === 'all' || agent.plan === filterPlan;
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      
      {/* Banner / Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-primary p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-[-50%] right-[-10%] w-[35%] h-[180%] bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="z-10 space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles size={22} className="text-yellow-300 animate-pulse" />
            <h1 className="text-xl font-extrabold tracking-tight">HBFlow AI Agents Layer</h1>
          </div>
          <p className="text-xs text-indigo-100 max-w-2xl leading-relaxed">
            Habilite, configure e audite agentes de Inteligência Artificial para automatizar triagens, qualificar leads, responder FAQs e otimizar seu pipeline comercial.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 text-right shrink-0 z-10">
          <span className="text-[10px] uppercase font-extrabold text-indigo-200 tracking-wider block">Assinatura Ativa</span>
          <span className="text-base font-black capitalize mt-0.5 block">{activeTenant.name}</span>
          <span className="inline-block bg-yellow-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full mt-1.5 uppercase tracking-wide">
            Plano {tenantPlan}
          </span>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-550 tracking-wider block">Execuções de IA</span>
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 block">{totalExecutions}</span>
          </div>
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0"><Cpu size={20} /></div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-550 tracking-wider block">Custo Estimado</span>
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 block font-mono">
              ${totalCost.toFixed(4)}
            </span>
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl shrink-0"><DollarSign size={20} /></div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-550 tracking-wider block">Taxa de Sucesso</span>
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 block">{successRate}%</span>
          </div>
          <div className="p-2.5 bg-violet-500/10 text-violet-600 rounded-xl shrink-0"><Check size={20} /></div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-550 tracking-wider block">Agentes Ativos</span>
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 block">
              {agentRegistry.filter(a => enabledAgentIds.includes(a.id) && isAgentAllowedForPlan(a.plan, tenantPlan)).length} / 15
            </span>
          </div>
          <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-xl shrink-0"><Bot size={20} /></div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between gap-4 items-center shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar agentes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-850 rounded-xl py-1.5 pl-9 pr-3 text-xs outline-none focus:border-primary transition-all font-medium text-slate-700 dark:text-slate-200"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
          <span className="text-xs text-slate-400 dark:text-slate-550 font-semibold hidden md:inline">Filtrar Plano:</span>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border dark:border-slate-800">
            {(['all', 'starter', 'pro', 'enterprise'] as const).map((plan) => (
              <button
                key={plan}
                onClick={() => setFilterPlan(plan)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold capitalize transition-all cursor-pointer ${
                  filterPlan === plan
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                {plan === 'all' ? 'Todos' : plan}
              </button>
            ))}
          </div>

          {totalExecutions > 0 && (
            <button
              onClick={clearAgentLogs}
              className="text-[10px] font-bold text-rose-500 hover:text-rose-600 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/40 dark:border-rose-900/30 rounded-xl transition-all cursor-pointer"
            >
              Limpar Logs
            </button>
          )}
        </div>
      </div>

      {/* Agents Catalog List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => {
          const isAllowed = isAgentAllowedForPlan(agent.plan, tenantPlan);
          const isEnabled = enabledAgentIds.includes(agent.id) && isAllowed;
          const usageCount = agentLogs.filter((l) => l.agentId === agent.id).length;

          return (
            <div
              key={agent.id}
              className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm transition-all flex flex-col justify-between relative overflow-hidden ${
                isAllowed 
                  ? 'border-slate-200 dark:border-slate-800 hover:shadow-md' 
                  : 'border-slate-200/60 dark:border-slate-850 opacity-90'
              }`}
            >
              {/* Lock overlay */}
              {!isAllowed && (
                <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-950/60 backdrop-blur-[1.5px] z-10 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                  <div className="p-3 bg-slate-900 dark:bg-slate-850 text-yellow-500 rounded-full shadow-lg border border-slate-800 mb-3">
                    <ShieldAlert size={20} />
                  </div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">Agente Bloqueado</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-1 max-w-[200px] leading-relaxed">
                    Exige o plano mínimo <strong>{getPlanMinRequirementLabel(agent.plan)}</strong>.
                  </p>
                  <button className="bg-gradient-to-r from-violet-600 to-primary hover:scale-102 text-white text-[10px] font-black py-2 px-4 rounded-xl mt-3.5 transition-all shadow-md shadow-primary/20 cursor-pointer">
                    Fazer Upgrade
                  </button>
                </div>
              )}

              {/* Card Content */}
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <span className={`text-[8.5px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    agent.plan === 'enterprise'
                      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-900/40'
                      : agent.plan === 'pro'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-900/40'
                      : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-805 dark:text-slate-350 dark:border-slate-700'
                  }`}>
                    {agent.plan}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Status Dot */}
                    <span className={`text-[9px] font-bold ${isEnabled ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {isEnabled ? 'Ativo' : 'Inativo'}
                    </span>
                    <button
                      onClick={() => toggleAgent(agent.id)}
                      disabled={!isAllowed}
                      className={`relative w-8 h-4 rounded-full transition-colors cursor-pointer outline-none shrink-0 ${
                        isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${
                        isEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-primary border dark:border-slate-800">
                    <Bot size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">{agent.name}</h3>
                    <span className="text-[8px] text-slate-400 dark:text-slate-555 uppercase tracking-widest font-bold font-mono">
                      Prioridade: {agent.priority}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 mb-4 min-h-[50px]">
                  {agent.description}
                </p>
              </div>

              {/* Bottom Actions */}
              <div className="flex justify-between items-center pt-3.5 border-t border-slate-100 dark:border-slate-800 mt-auto">
                <span className="text-[10px] text-slate-400 dark:text-slate-550 font-semibold font-mono">
                  {usageCount} execuções
                </span>
                
                <Link
                  href={`/dashboard/agentes/${agent.id}`}
                  className="text-[10.5px] font-black text-primary hover:text-primary-hover flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Configurar</span>
                  <ArrowUpRight size={12} />
                </Link>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
