'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import OnboardingChecklist from '@/components/OnboardingChecklist';
import {
  MessageSquare,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  Award
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

export default function DashboardPage() {
  const { conversations, contacts, users, departments, demo_mode_enabled } = useStore();
  const [nowTimestamp] = React.useState(() => Date.now());

  // Render empty state if there are no conversations
  if (conversations.length === 0) {
    return (
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Painel de Controle</h1>
            <p className="text-xs text-slate-500 mt-1">
              Veja as estatísticas de conversação, tempo de resposta e performance dos atendentes em tempo real.
            </p>
          </div>
        </div>

        {/* Onboarding Checklist Widget */}
        <OnboardingChecklist />

        {/* Professional Empty State */}
        <div className="bg-white border border-slate-200 rounded-3xl p-12 shadow-sm text-center flex flex-col items-center justify-center gap-4 relative overflow-hidden min-h-[400px]">
          <div className="absolute top-[-50%] right-[-10%] w-[40%] h-[150%] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm shrink-0">
            <MessageSquare size={32} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Nenhuma atividade registrada ainda.</h2>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
            Acompanhe o progresso da sua empresa à medida que novas interações forem criadas.
          </p>
        </div>
      </div>
    );
  }

  // 1. Metric Calculations
  const totalConversations = conversations.length;
  const openAttends = conversations.filter((c) => c.status === 'open' || c.status === 'pending').length;
  const closedAttends = conversations.filter((c) => c.status === 'closed').length;

  // SLA Warnings Count
  const nowTimestampDate = new Date(nowTimestamp);
  const slaBreached = conversations.filter(
    (c) => c.status !== 'closed' && c.slaLimitAt && new Date(c.slaLimitAt).getTime() < nowTimestamp
  ).length;

  // Resilient Average Wait and Attendance Time calculations
  let totalWaitMs = 0;
  let waitCount = 0;

  conversations.forEach((c) => {
    if (c.status === 'new') {
      // Chat is waiting in queue
      const start = c.waitStartedAt ? new Date(c.waitStartedAt).getTime() : new Date(c.createdAt).getTime();
      const wait = nowTimestamp - start;
      if (wait > 0) {
        totalWaitMs += wait;
        waitCount++;
      }
    } else {
      // Chat has been claimed
      const start = c.createdAt ? new Date(c.createdAt).getTime() : null;
      const claim = c.claimedAt ? new Date(c.claimedAt).getTime() : null;
      if (start && claim) {
        const wait = claim - start;
        if (wait > 0) {
          totalWaitMs += wait;
          waitCount++;
        }
      } else if (start) {
        // Fallback wait estimate if claimedAt is null but chat is in progress
        const upd = new Date(c.updatedAt).getTime();
        const wait = Math.min(upd - start, 5 * 60 * 1000); // capped at 5 minutes for safety
        if (wait > 0) {
          totalWaitMs += wait;
          waitCount++;
        }
      }
    }
  });

  const avgWaitMin = waitCount > 0 ? (totalWaitMs / waitCount / 60000).toFixed(1) : (demo_mode_enabled ? '3.2' : '0.0');

  let totalAttendMs = 0;
  let attendCount = 0;

  conversations.forEach((c) => {
    if (c.status !== 'new') {
      // Chat in progress or resolved
      const start = c.claimedAt ? new Date(c.claimedAt).getTime() : new Date(c.createdAt).getTime();
      const end = c.status === 'closed' 
        ? (c.closedAt ? new Date(c.closedAt).getTime() : new Date(c.updatedAt).getTime())
        : nowTimestamp;
      const duration = end - start;
      if (duration > 0) {
        totalAttendMs += duration;
        attendCount++;
      }
    }
  });

  const avgAttendMin = attendCount > 0 ? (totalAttendMs / attendCount / 60000).toFixed(1) : (demo_mode_enabled ? '8.5' : '0.0');

  // Traffic calculation from real store data
  const getRealTrafficData = () => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const data = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayName = days[d.getDay()];
      
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      
      const dayConvs = conversations.filter(c => {
        const cDate = new Date(c.createdAt);
        return cDate >= startOfDay && cDate <= endOfDay;
      });
      
      let dayMsgs = 0;
      conversations.forEach(c => {
        const msgs = c.messages.filter(m => {
          const mDate = new Date(m.createdAt);
          return mDate >= startOfDay && mDate <= endOfDay;
        });
        dayMsgs += msgs.length;
      });
      
      data.push({
        name: dayName,
        mensagens: dayMsgs,
        contatos: dayConvs.length
      });
    }
    return data;
  };

  // Message traffic data
  const trafficData = demo_mode_enabled ? [
    { name: 'Seg', mensagens: 420, contatos: 85 },
    { name: 'Ter', mensagens: 580, contatos: 120 },
    { name: 'Qua', mensagens: 690, contatos: 145 },
    { name: 'Qui', mensagens: 510, contatos: 110 },
    { name: 'Sex', mensagens: 780, contatos: 160 },
    { name: 'Sáb', mensagens: 320, contatos: 65 },
    { name: 'Dom', mensagens: 180, contatos: 30 }
  ] : getRealTrafficData();

  // 2. Ranking of Agents/Users based on real conversation data
  const userRanking = users.map((user) => {
    const userConvs = conversations.filter((c) => c.assignedUserId === user.id);
    const activeCount = userConvs.filter((c) => c.status === 'open' || c.status === 'pending').length;
    const closedCount = userConvs.filter((c) => c.status === 'closed').length;
    const totalCount = userConvs.length;

    return {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
      role: user.role || 'Atendente',
      activeCount,
      closedCount,
      totalCount
    };
  })
  // Sort by total attributed conversations
  .sort((a, b) => b.totalCount - a.totalCount);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Painel de Controle</h1>
          <p className="text-xs text-slate-500 mt-1">
            Veja as estatísticas de conversação, tempo de resposta e performance dos atendentes em tempo real.
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
          Filtro: <span className="font-semibold text-slate-800">Últimos 7 dias</span>
        </div>
      </div>

      {/* Onboarding Checklist Widget */}
      <OnboardingChecklist />

      {/* Metric Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Conversations */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <MessageSquare size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Conversas Totais</span>
            <span className="text-2xl font-bold text-slate-800">{totalConversations}</span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
              {openAttends} ativas / {closedAttends} resolvidos
            </span>
          </div>
        </div>

        {/* Metric 2: Average Wait Time (TME) */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Tempo Médio de Espera (TME)</span>
            <span className="text-2xl font-bold text-slate-800">{avgWaitMin} min</span>
            <span className="text-[10px] text-amber-600 font-medium block mt-0.5">Tempo médio em fila</span>
          </div>
        </div>

        {/* Metric 3: Average Attendance Time (TMA) */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Média de Atendimento (TMA)</span>
            <span className="text-2xl font-bold text-slate-800">{avgAttendMin} min</span>
            <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">Duração do chat ativo</span>
          </div>
        </div>

        {/* Metric 4: SLAs Expired */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">SLAs Vencidos</span>
            <span className={`text-2xl font-bold ${slaBreached > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
              {slaBreached}
            </span>
            <span className="text-[10px] text-rose-600 font-medium block mt-0.5">Excederam o tempo</span>
          </div>
        </div>
      </div>

      {/* Main Graphs & Leaderboard */}
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

        {/* Leaderboard: Ranking of Attendants */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col h-[320px]">
          <div className="mb-4 flex items-center justify-between border-b pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Award size={16} className="text-amber-500" />
                Ranking de Atendimentos
              </h3>
              <p className="text-[10px] text-slate-400">Desempenho de chamados por atendente</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
            {userRanking.length === 0 ? (
              <div className="text-center py-12 text-slate-400">Nenhum atendente cadastrado.</div>
            ) : (
              userRanking.map((rank, idx) => {
                const maxConvs = userRanking[0]?.totalCount || 1;
                // Avoid divide by zero
                const pct = Math.max(5, Math.round((rank.totalCount / maxConvs) * 100));

                return (
                  <div key={rank.id} className="flex items-center gap-3">
                    {/* Medal/Podium Badge */}
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      idx === 0 ? 'bg-amber-100 text-amber-600 border border-amber-200' :
                      idx === 1 ? 'bg-slate-100 text-slate-500 border border-slate-200' :
                      idx === 2 ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                      'bg-slate-50 text-slate-400 border border-slate-150'
                    }`}>
                      {idx + 1}
                    </div>

                    {/* Avatar */}
                    <img
                      src={rank.avatarUrl}
                      alt={rank.name}
                      className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                    />

                    {/* Content & Progress Bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-bold text-slate-800 truncate block max-w-[100px]" title={rank.name}>
                          {rank.name}
                        </span>
                        <span className="text-[9.5px] text-slate-400 font-semibold shrink-0">
                          <span className="text-primary font-bold">{rank.activeCount}</span> ativos /{' '}
                          <span className="text-emerald-600 font-bold">{rank.closedCount}</span> resolvidos
                        </span>
                      </div>
                      
                      {/* Bar indicator */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-primary h-full rounded-full transition-all duration-500" 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
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
