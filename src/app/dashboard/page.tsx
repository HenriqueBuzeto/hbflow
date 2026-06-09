'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import {
  MessageSquare,
  Users,
  Clock,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Briefcase,
  CheckSquare
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
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function DashboardPage() {
  const { conversations, contacts, deals, tasks, users, departments } = useStore();
  const [nowTimestamp] = React.useState(() => Date.now());

  // 1. Metric Calculations
  const totalConversations = conversations.length;
  const newLeads = contacts.filter((c) => c.status === 'lead').length;
  const openAttends = conversations.filter((c) => c.status === 'open').length;
  const closedAttends = conversations.filter((c) => c.status === 'closed').length;

  const activeDeals = deals.filter((d) => d.status === 'open');
  const totalPipelineValue = activeDeals.reduce((sum, d) => sum + d.value, 0);

  const pendingTasks = tasks.filter((t) => t.status === 'pending');

  // SLA Warnings Count
  const now = new Date();
  const slaBreached = conversations.filter(
    (c) => c.status !== 'closed' && c.slaLimitAt && new Date(c.slaLimitAt) < now
  ).length;

  // Average Wait and Attendance Time calculations
  const waitingConvs = conversations.filter(c => c.status === 'new' && c.waitStartedAt);
  const claimedConvs = conversations.filter(c => c.claimedAt);
  
  let totalWaitMs = 0;
  let waitCount = 0;

  waitingConvs.forEach(c => {
    if (c.waitStartedAt) {
      totalWaitMs += nowTimestamp - new Date(c.waitStartedAt).getTime();
      waitCount++;
    }
  });

  claimedConvs.forEach(c => {
    if (c.claimedAt) {
      const wait = new Date(c.claimedAt).getTime() - new Date(c.createdAt).getTime();
      if (wait > 0) {
        totalWaitMs += wait;
        waitCount++;
      }
    }
  });

  const avgWaitMin = waitCount > 0 ? (totalWaitMs / waitCount / 60000).toFixed(1) : '3.2';

  let totalAttendMs = 0;
  let attendCount = 0;
  conversations.forEach(c => {
    if (c.claimedAt) {
      const end = c.status === 'closed' ? new Date(c.updatedAt).getTime() : nowTimestamp;
      const duration = end - new Date(c.claimedAt).getTime();
      if (duration > 0) {
        totalAttendMs += duration;
        attendCount++;
      }
    }
  });

  const avgAttendMin = attendCount > 0 ? (totalAttendMs / attendCount / 60000).toFixed(1) : '8.5';

  // 2. Charts Data
  // Message volume trend (Last 7 days mock)
  const trafficData = [
    { name: 'Seg', mensagens: 420, contatos: 85 },
    { name: 'Ter', mensagens: 580, contatos: 120 },
    { name: 'Qua', mensagens: 690, contatos: 145 },
    { name: 'Qui', mensagens: 510, contatos: 110 },
    { name: 'Sex', mensagens: 780, contatos: 160 },
    { name: 'Sáb', mensagens: 320, contatos: 65 },
    { name: 'Dom', mensagens: 180, contatos: 30 }
  ];

  // Pipeline stage counts
  const stageData = [
    { name: 'Novo Lead', valor: deals.filter((d) => d.stageId === 'stage-1').reduce((sum, d) => sum + d.value, 0) },
    { name: 'Em Atendimento', valor: deals.filter((d) => d.stageId === 'stage-2').reduce((sum, d) => sum + d.value, 0) },
    { name: 'Proposta Enviada', valor: deals.filter((d) => d.stageId === 'stage-3').reduce((sum, d) => sum + d.value, 0) },
    { name: 'Negociação', valor: deals.filter((d) => d.stageId === 'stage-4').reduce((sum, d) => sum + d.value, 0) },
    { name: 'Ganho', valor: deals.filter((d) => d.status === 'won').reduce((sum, d) => sum + d.value, 0) },
    { name: 'Perdido', valor: deals.filter((d) => d.status === 'lost').reduce((sum, d) => sum + d.value, 0) }
  ];

  // Agent Performance Conversion
  const COLORS = ['#7C3AED', '#10B981', '#F59E0B', '#3B82F6', '#EC4899'];
  const agentPerformance = users.map((u) => {
    // Mocking some sales closed won
    const wonCount = deals.filter((d) => d.assignedUserId === u.id && d.status === 'won').length;
    const totalCount = deals.filter((d) => d.assignedUserId === u.id).length || 1;
    const conversion = Math.round((wonCount / totalCount) * 100) || 20; // fallback default
    return {
      name: u.name,
      value: conversion
    };
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Painel de Controle</h1>
          <p className="text-xs text-slate-500 mt-1">
            Veja as estatísticas de conversação, atendimento e performance comercial do HBFlow em tempo real.
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
          Filtro: <span className="font-semibold text-slate-800">Últimos 7 dias</span>
        </div>
      </div>

      {/* Metric Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <MessageSquare size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Conversas Totais</span>
            <span className="text-2xl font-bold text-slate-800">{totalConversations}</span>
            <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">+12% vs ontem</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Users size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Novos Leads</span>
            <span className="text-2xl font-bold text-slate-800">{newLeads}</span>
            <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">+8% este mês</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Tempo Médio de Espera</span>
            <span className="text-2xl font-bold text-slate-800">{avgWaitMin} min</span>
            <span className="text-[10px] text-amber-600 font-medium block mt-0.5">Tempo em fila</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Média de Atendimento</span>
            <span className="text-2xl font-bold text-slate-800">{avgAttendMin} min</span>
            <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">Conversa ativa</span>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">SLAs Vencidos</span>
            <span className="text-2xl font-bold text-slate-800">{slaBreached}</span>
            <span className="text-[10px] text-rose-600 font-medium block mt-0.5">Excederam limite</span>
          </div>
        </div>
      </div>

      {/* CRM Business Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <DollarSign size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Valor em Negociação (Pipeline)</span>
            <span className="text-xl font-bold text-slate-800">
              {totalPipelineValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
            <Briefcase size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Oportunidades Ativas</span>
            <span className="text-xl font-bold text-slate-800">{activeDeals.length} negócios</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <CheckSquare size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Tarefas de Vendas Pendentes</span>
            <span className="text-xl font-bold text-slate-800">{pendingTasks.length} follow-ups</span>
          </div>
        </div>
      </div>

      {/* Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph 1: Message Volume Area Chart */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm lg:col-span-2 flex flex-col h-[320px]">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <TrendingUp size={16} className="text-primary" />
              Volume de Mensagens Diárias
            </h3>
            <p className="text-[10px] text-slate-400">Total de interações recebidas e novos contatos criados</p>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                <Area type="monotone" dataKey="mensagens" stroke="#7C3AED" strokeWidth={2} fillOpacity={1} fill="url(#colorMsg)" name="Mensagens" />
                <Area type="monotone" dataKey="contatos" stroke="#10B981" strokeWidth={2} fillOpacity={0} name="Novos Contatos" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Conversion pie chart */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col h-[320px]">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800">Conversão por Atendente (%)</h3>
            <p className="text-[10px] text-slate-400">Taxa de sucesso no fechamento de leads comerciais</p>
          </div>
          <div className="flex-1 w-full min-h-0 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={agentPerformance}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {agentPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} contentStyle={{ fontSize: 11 }} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" iconSize={10} wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 3: Pipeline Stages Bar Chart */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm lg:col-span-3 h-[280px]">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800">Valores por Etapa do Pipeline</h3>
            <p className="text-[10px] text-slate-400">Valor estimado total alocado em cada fase do Kanban</p>
          </div>
          <div className="w-full h-full pb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip formatter={(value) => `R$ ${value}`} contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="valor" fill="#7C3AED" radius={[6, 6, 0, 0]} name="Volume Financeiro">
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Ganho' ? '#10B981' : entry.name === 'Perdido' ? '#EF4444' : '#7C3AED'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Active Departments / Queues status */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Filas de Atendimento (Setores)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {departments.map((dept) => {
            const count = conversations.filter(c => c.departmentId === dept.id && c.status !== 'closed').length;
            return (
              <div key={dept.id} className="border border-slate-100 rounded-xl p-4 flex justify-between items-center bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
                    <span className="text-xs font-bold text-slate-700">{dept.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Regra: {dept.distributionMode}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-600 block">Em aberto</span>
                  <span className="text-lg font-bold text-slate-800">{count} chats</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
