'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Bot,
  Zap,
  Clock,
  DollarSign,
  Cpu,
  ArrowLeft,
  Calendar,
  Layers,
  Sparkles,
  Award,
  Users,
  ShieldCheck,
  Terminal
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell
} from 'recharts';

// Mock ROI calculations
const MOCK_METRICS = {
  totalExecutions: 1428,
  totalCostUsd: 0.8568, // very cheap cost with gpt-4o-mini
  avgResponseTimeMs: 420, // 0.42 seconds
  leadsQualified: 582,
  hoursSaved: 95.2, // ~4 minutes per chat saved
  costSavedBrl: 2380.00 // based on human salary cost saved
};

const AGENT_VOLUME_DATA = [
  { name: 'Triage Agent', volume: 642, color: '#7c3aed' },
  { name: 'SDR Agent', volume: 412, color: '#a78bfa' },
  { name: 'Billing Agent', volume: 220, color: '#6366f1' },
  { name: 'Summary Agent', volume: 154, color: '#818cf8' }
];

const HISTORY_DATA = [
  { day: 'Seg', execs: 182, cost: 0.109 },
  { day: 'Ter', execs: 210, cost: 0.126 },
  { day: 'Qua', execs: 198, cost: 0.118 },
  { day: 'Qui', execs: 245, cost: 0.147 },
  { day: 'Sex', execs: 220, cost: 0.132 },
  { day: 'Sáb', execs: 110, cost: 0.066 },
  { day: 'Dom', execs: 85, cost: 0.051 },
  { day: 'Hoje', execs: 178, cost: 0.106 }
];

const MOCK_LOGS = [
  { time: '10:45:12', agent: 'SDR Agent', event: 'Qualificou lead "Gustavo Lima" - Score: 85/100 (Quente)', cost: 0.00062 },
  { time: '10:43:08', agent: 'Triage Agent', event: 'Mensagem de "Patrícia Silva" roteada para Setor Financeiro', cost: 0.00041 },
  { time: '10:39:55', agent: 'Billing Agent', event: 'Gerou e enviou link de fatura atualizada para "Renato Souza"', cost: 0.00078 },
  { time: '10:35:12', agent: 'Summary Agent', event: 'Arquivou histórico de atendimento "Suporte Técnico" - Sentimento: Positivo', cost: 0.00052 },
  { time: '10:31:02', agent: 'Triage Agent', event: 'Mensagem de "Luiza Santos" classificada como Comercial e enviada ao SDR', cost: 0.00041 },
  { time: '10:25:44', agent: 'SDR Agent', event: 'Registrou novo lead "Carla Medeiros" (Óticas) no Kanban', cost: 0.00068 },
  { time: '10:19:30', agent: 'Billing Agent', event: 'Disparou alerta amigável de vencimento de boleto para "Daniel Alencar"', cost: 0.00075 }
];

export default function AnalyticsPage() {
  const router = useRouter();
  
  // Simulated real-time log updates
  const [liveLogs, setLiveLogs] = useState(MOCK_LOGS);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const names = ['André Costa', 'Marcela Guedes', 'Júlio Cesar', 'Clínica Sorriso', 'Otica Popular'];
      const name = names[Math.floor(Math.random() * names.length)];
      
      const newLog = {
        time: new Date().toLocaleTimeString('pt-BR'),
        agent: Math.random() > 0.5 ? 'SDR Agent' : 'Triage Agent',
        event: Math.random() > 0.5 
          ? `Qualificou oportunidade "${name}" - Classificação Comercial` 
          : `Triagem identificou intenção de suporte para "${name}"`,
        cost: Number((Math.random() * 0.0008 + 0.0002).toFixed(5))
      };

      setLiveLogs(prev => [newLog, ...prev.slice(0, 7)]);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0b0c10] text-slate-100 font-sans min-h-screen relative selection:bg-primary selection:text-white pb-20 always-dark">
      
      {/* Background Blurs */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[170px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-20 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Floating Header */}
      <header className="sticky top-0 w-full z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-900 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <img src="/logo hbflow.png" alt="HBFlow Logo" className="h-[240px] w-auto object-contain my-[-105px] mx-[-90px]" />
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <button onClick={() => router.push('/')} className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-none">
              <ArrowLeft size={12} /> Voltar ao Site
            </button>
            <span className="text-slate-700">|</span>
            <button onClick={() => router.push('/agentes')} className="hover:text-primary transition-colors cursor-pointer bg-transparent border-none">
              Equipe de IA
            </button>
            <button onClick={() => router.push('/agentes/playground')} className="hover:text-primary transition-colors cursor-pointer bg-transparent border-none">
              Playground de IA
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

      {/* Title Header */}
      <section className="pt-12 pb-6 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary mb-4 uppercase tracking-wider">
          <TrendingUp size={11} className="animate-pulse" />
          <span>Real-time Operational ROI</span>
        </div>
        <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight">
          Analytics do <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">Operador de IA</span>
        </h1>
        <p className="text-slate-400 text-xs md:text-sm mt-3 max-w-xl mx-auto leading-relaxed font-medium">
          Demonstração de performance, economia de horas e ROI gerado pela força de trabalho de IA integrada ao WhatsApp da sua empresa.
        </p>
      </section>

      {/* Main Stats Grid */}
      <main className="px-6 max-w-7xl mx-auto mt-6 space-y-8">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">Execuções de IA</span>
              <span className="text-2xl font-black text-white mt-1 block font-mono">
                {MOCK_METRICS.totalExecutions}
              </span>
              <span className="text-[9px] text-slate-500 font-bold block mt-1.5">Média de R$ 0,003 por chamada</span>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-2xl shrink-0">
              <Cpu size={20} />
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">Custo API Acumulado</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block font-mono">
                ${MOCK_METRICS.totalCostUsd.toFixed(4)}
              </span>
              <span className="text-[9px] text-slate-500 font-bold block mt-1.5">Groq & OpenAI gpt-4o-mini</span>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl shrink-0">
              <DollarSign size={20} />
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">Tempo de Trabalho Salvo</span>
              <span className="text-2xl font-black text-indigo-300 mt-1 block font-mono">
                {MOCK_METRICS.hoursSaved}h
              </span>
              <span className="text-[9px] text-slate-500 font-bold block mt-1.5">Equivale a 12 dias de atendente</span>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl shrink-0">
              <Clock size={20} />
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">Economia Gerada (ROI)</span>
              <span className="text-2xl font-black text-white mt-1 block font-mono">
                R$ {MOCK_METRICS.costSavedBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] text-emerald-400 font-bold block mt-1.5">Lucro líquido operacional</span>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl shrink-0">
              <Award size={20} />
            </div>
          </div>

        </div>

        {/* Charts & Graphs Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Daily History Chart */}
          <div className="lg:col-span-2 bg-slate-955/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar size={14} className="text-primary" />
                Histórico de Execuções Semanais
              </h3>
              <p className="text-[10px] text-slate-500 font-medium mb-4">Volume total de chamadas de IA por dia da semana</p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={HISTORY_DATA}>
                  <defs>
                    <linearGradient id="colorExecs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090a0f', borderColor: '#1e293b', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#fff', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="execs" stroke="#7c3aed" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExecs)" name="Execuções" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Agent Distribution Chart */}
          <div className="bg-slate-955/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Layers size={14} className="text-primary" />
                Distribuição por Agente
              </h3>
              <p className="text-[10px] text-slate-500 font-medium mb-6">Total de atendimentos resolvidos por tipo de IA</p>
            </div>
            
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={AGENT_VOLUME_DATA} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9.5} width={80} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090a0f', borderColor: '#1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="volume" radius={[0, 6, 6, 0]} barSize={14} name="Chamados">
                    {AGENT_VOLUME_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-900 grid grid-cols-2 gap-2 text-[9px] font-bold uppercase text-slate-500 tracking-wider">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Triagem</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-400" /> Qualificação</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-600" /> Cobrança</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500" /> Resumos</span>
            </div>
          </div>

        </div>

        {/* Real-time Logs Console */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Terminal size={14} className="text-primary animate-pulse" />
                Auditoria e Logs Operacionais da IA
              </h3>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Status de execução das últimas chamadas dos agentes (atualizado automaticamente)</p>
            </div>
            <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary uppercase tracking-widest animate-pulse">
              Live Feed
            </span>
          </div>

          <div className="bg-[#050507] border border-slate-900 rounded-2xl p-4 font-mono text-[10.5px] leading-relaxed max-h-[300px] overflow-y-auto space-y-2.5 text-slate-350 shadow-inner">
            {liveLogs.map((log, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-900/40 pb-2 gap-1.5 hover:bg-slate-900/10 px-1 rounded transition-colors">
                <div className="flex items-start sm:items-center gap-2">
                  <span className="text-slate-600 text-[9.5px] font-bold">[{log.time}]</span>
                  <span className="text-primary font-black uppercase text-[8.5px] tracking-wider font-sans bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
                    {log.agent}
                  </span>
                  <span className="text-slate-300 font-medium">{log.event}</span>
                </div>
                <span className="text-slate-500 font-bold shrink-0">
                  Custo: <span className="text-emerald-500 font-mono">${log.cost.toFixed(5)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

      </main>

    </div>
  );
}
