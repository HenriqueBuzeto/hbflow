'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Bot,
  Zap,
  Layers,
  Clock,
  Check,
  ChevronDown,
  ArrowRight,
  Shield,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  Cpu,
  Bookmark,
  TrendingUp,
  Award
} from 'lucide-react';
import { agentRegistry } from '@/agents/core/agent-registry';

export default function PublicAgentsCatalog() {
  const router = useRouter();
  const [filterPlan, setFilterPlan] = useState<'all' | 'starter' | 'pro' | 'enterprise'>('all');

  const filteredAgents = agentRegistry.filter((agent) => {
    return filterPlan === 'all' || agent.plan === filterPlan;
  });

  return (
    <div className="bg-[#0b0c10] text-slate-100 font-sans min-h-screen relative selection:bg-primary selection:text-white pb-20 always-dark">
      
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] pointer-events-none -z-10" />
      <div className="absolute top-[800px] right-10 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Floating Header */}
      <header className="sticky top-0 w-full z-50 bg-slate-955/80 backdrop-blur-lg border-b border-slate-900 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <img src="/logo hbflow.png" alt="HBFlow Logo" className="h-[140px] w-auto object-contain my-[-60px] mx-[-50px]" />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <button onClick={() => router.push('/')} className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-none">
              <ArrowLeft size={12} /> Voltar ao Site
            </button>
            <span className="text-slate-700">|</span>
            <button onClick={() => router.push('/agentes/playground')} className="hover:text-primary transition-colors cursor-pointer bg-transparent border-none">
              Playground de IA
            </button>
            <button onClick={() => router.push('/agentes/analytics')} className="hover:text-primary transition-colors cursor-pointer bg-transparent border-none">
              Analytics de IA
            </button>
          </nav>

          {/* Actions */}
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

      {/* Hero Header */}
      <section className="relative pt-16 pb-12 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary mb-4 uppercase tracking-wider">
            <Bot size={11} className="animate-pulse" />
            <span>AI Workforce Layer</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Conheça sua equipe de <span className="bg-gradient-to-r from-primary via-indigo-400 to-violet-500 bg-clip-text text-transparent">Agentes de IA</span>
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-4 max-w-xl mx-auto leading-relaxed font-medium">
            O HBFlow disponibiliza 15 agentes inteligentes especialistas. Eles atuam em segundo plano qualificando leads, cobrando boletos e gerindo sua operação de atendimento de forma autônoma.
          </p>

          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => router.push('/agentes/playground')}
              className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-3 rounded-xl transition-all shadow-lg shadow-primary/20 cursor-pointer flex items-center gap-1.5"
            >
              <Cpu size={14} />
              <span>Experimentar no Playground</span>
            </button>
            <button
              onClick={() => router.push('/agentes/analytics')}
              className="border border-slate-800 hover:border-slate-700 bg-slate-900/40 text-slate-300 text-xs font-bold px-5 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <TrendingUp size={14} />
              <span>Ver Analytics do Operador</span>
            </button>
          </div>
        </div>
      </section>

      {/* Plan Selector Tab */}
      <section className="px-6 mb-12">
        <div className="max-w-7xl mx-auto flex justify-center">
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-900 shadow">
            {[
              { id: 'all', label: 'Todos os Agentes' },
              { id: 'starter', label: 'Starter' },
              { id: 'pro', label: 'Pro' },
              { id: 'enterprise', label: 'Enterprise' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterPlan(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                  filterPlan === tab.id
                    ? 'bg-primary text-white shadow shadow-primary/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Agents Grid List */}
      <section className="px-6 mb-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <motion.div
              key={agent.id}
              whileHover={{ y: -5 }}
              className="bg-slate-955/80 border border-slate-800 rounded-3xl p-6 transition-all flex flex-col justify-between shadow-xl"
            >
              <div>
                {/* Badge Plan */}
                <div className="flex justify-between items-center mb-4">
                  <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    agent.plan === 'enterprise'
                      ? 'bg-purple-950/30 text-purple-355 border-purple-900/40'
                      : agent.plan === 'pro'
                      ? 'bg-indigo-950/30 text-indigo-355 border-indigo-900/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}>
                    Plano {agent.plan}
                  </span>
                  
                  <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                    Prioridade: {agent.priority}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-primary shrink-0">
                    🤖
                  </div>
                  <h3 className="text-xs font-bold text-white">{agent.name}</h3>
                </div>

                <p className="text-[11px] text-slate-450 leading-relaxed font-medium min-h-[50px]">
                  {agent.description}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-900/60">
                  <span className="text-[9.5px] text-slate-500 font-bold block mb-1">Gatilhos operacionais:</span>
                  <div className="flex flex-wrap gap-1">
                    {agent.triggers.map(t => (
                      <span key={t} className="text-[8px] font-mono bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded text-slate-400">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-900/60">
                <button
                  onClick={() => router.push(`/agentes/playground?agent=${agent.id}`)}
                  className="flex-1 bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-800 text-[10.5px] font-bold py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Cpu size={12} />
                  <span>Simular Agente</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Visual Workflow Timeline */}
      <section className="py-16 px-6 bg-slate-950/40 border-t border-slate-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-xl md:text-2xl font-extrabold text-white">Como a Força de Trabalho de IA Opera</h3>
            <p className="text-slate-400 text-xs mt-2">
              Os agentes operam de forma interconectada, transferindo tarefas em uma linha de produção automatizada:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            <div className="hidden md:block absolute top-[28px] left-[10%] right-[10%] h-[2px] bg-slate-800 -z-10" />

            {[
              { id: '1', title: 'Triagem Inicial', desc: 'Triage Agent classifica e direciona a intenção.', color: 'text-primary' },
              { id: '2', title: 'Qualificação (SDR)', desc: 'SDR Agent coleta dados de interesse e contato.', color: 'text-violet-400' },
              { id: '3', title: 'Pipeline Comercial', desc: 'Workflow Agent insere lead e abre negócio no Kanban.', color: 'text-indigo-400' },
              { id: '4', title: 'Acompanhamento', desc: 'Follow-up Agent reativa negociações ociosas.', color: 'text-emerald-400' },
              { id: '5', title: 'Supervisão de SLA', desc: 'Supervisor Agent audita o tempo das filas humanas.', color: 'text-rose-400' }
            ].map((step, idx) => (
              <div key={idx} className="bg-slate-900/30 border border-slate-800 rounded-2xl p-4 flex flex-col items-center md:items-start text-center md:text-left">
                <div className={`w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-xs mb-3 ${step.color}`}>
                  {step.id}
                </div>
                <h4 className="text-xs font-bold text-white mb-1.5">{step.title}</h4>
                <p className="text-[10.5px] text-slate-400 leading-normal font-medium">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Grid */}
      <section className="py-20 px-6 border-t border-slate-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-xl md:text-2xl font-extrabold text-white">Comparativo de Distribuição de Agentes</h3>
            <p className="text-slate-400 text-xs mt-2">
              Confira a distribuição dos agentes inteligentes em cada plano comercial do HBFlow:
            </p>
          </div>

          <div className="border border-slate-800 rounded-3xl overflow-hidden shadow-xl bg-slate-950/80 text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-300 font-bold">
                  <th className="p-4 font-extrabold">Grupo de Agentes</th>
                  <th className="p-4 font-bold text-center">Starter</th>
                  <th className="p-4 font-bold text-center">Pro</th>
                  <th className="p-4 font-extrabold text-primary text-center bg-primary/5">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-400">
                <tr className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-4 font-bold text-slate-350">Agentes Básicos (Triage, FAQ, Summary)</td>
                  <td className="p-4 text-center text-emerald-500">✅</td>
                  <td className="p-4 text-center text-emerald-500">✅</td>
                  <td className="p-4 text-center text-emerald-500 bg-primary/5 font-extrabold">✅</td>
                </tr>
                <tr className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-4 font-bold text-slate-350">Agentes de Vendas e Cobrança (SDR, Sales, Billing, Follow-up)</td>
                  <td className="p-4 text-center text-rose-500">❌</td>
                  <td className="p-4 text-center text-emerald-500">✅</td>
                  <td className="p-4 text-center text-emerald-500 bg-primary/5 font-extrabold">✅</td>
                </tr>
                <tr className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-4 font-bold text-slate-350">Agentes de Gestão e Análise (Supervisor, Forecast, Coach, Copilot)</td>
                  <td className="p-4 text-center text-rose-500">❌</td>
                  <td className="p-4 text-center text-rose-500">❌</td>
                  <td className="p-4 text-center text-emerald-500 bg-primary/5 font-extrabold">✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 text-center text-slate-655 text-[10.5px]">
        <span>© 2026 HBFlow Layer. Todos os direitos reservados.</span>
      </footer>

    </div>
  );
}
