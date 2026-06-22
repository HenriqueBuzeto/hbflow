'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { 
  Building, 
  Loader2, 
  Search, 
  ShieldCheck,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Users,
  CheckCircle,
  FileText,
  Clock,
  Sparkles,
  Unlock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function AdminFinanceiroProfessionalPage() {
  const { currentTenantId } = useStore();
  
  // Lists
  const [invoices, setInvoices] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [blockedTenants, setBlockedTenants] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'paid'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load metrics
      const mRes = await fetch('/api/v1/admin/billing/metrics');
      if (mRes.ok) {
        const mData = await mRes.json();
        if (mData.success) {
          setMetrics(mData.metrics);
          setBlockedTenants(mData.blockedTenants || []);
          setChartData(mData.chartData || []);
        }
      }

      // Load all client invoices
      const iRes = await fetch('/api/v1/admin/billing/invoices');
      if (iRes.ok) {
        const iData = await iRes.json();
        if (iData.success) {
          setInvoices(iData.invoices || []);
        }
      }
    } catch (err: any) {
      setError('Erro ao carregar dados do faturamento administrativo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInvoiceAction = async (invoiceId: string, action: 'confirm' | 'confidence') => {
    setActionLoadingId(invoiceId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/v1/admin/billing/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar ação');
      
      setSuccess(action === 'confirm' 
        ? 'Pagamento confirmado e assinatura renovada com sucesso!' 
        : 'Acesso temporário de 3 dias por Confiança liberado com sucesso!'
      );
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnblockTenant = async (tenantId: string) => {
    setActionLoadingId(tenantId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/v1/admin/tenants/${tenantId}/subscription/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: metrics?.plans?.proId || 'pro' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao reativar acesso');
      
      setSuccess('Acesso da empresa reativado com sucesso!');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter invoices based on tab and search term (CNPJ or Company Name)
  const filteredInvoices = invoices.filter((inv) => {
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'paid' && inv.status === 'paid') || 
      (activeTab === 'pending' && (inv.status === 'open' || inv.status === 'overdue'));
      
    const companyName = inv.tenant?.name?.toLowerCase() || '';
    const companyCnpj = inv.tenant?.document?.toLowerCase() || '';
    const invoiceNum = inv.invoiceNumber?.toLowerCase() || '';
    
    const matchesSearch = 
      companyName.includes(searchTerm.toLowerCase()) || 
      companyCnpj.includes(searchTerm.toLowerCase()) || 
      invoiceNum.includes(searchTerm.toLowerCase());
      
    return matchesTab && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-8 font-sans always-dark">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldCheck className="text-primary" size={24} /> Painel Financeiro Administrativo
            </h1>
            <span className="text-slate-500">/</span>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">HBFlow Control</span>
          </div>
          {loading && <Loader2 className="animate-spin text-primary" size={18} />}
        </div>

        {error && <div className="bg-rose-950/30 border border-rose-500/30 text-rose-350 p-4 rounded-xl text-xs font-bold font-mono">{error}</div>}
        {success && <div className="bg-emerald-950/30 border border-emerald-500/30 text-emerald-450 p-4 rounded-xl text-xs font-bold font-mono">{success}</div>}

        {/* Metrics Overview Cards */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* MRR */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-violet-950/40 border border-violet-850/30 flex items-center justify-center text-primary shrink-0">
                <DollarSign size={20} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">MRR SaaS Geral</span>
                <span className="text-xl font-bold text-white">
                  {metrics.mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[9px] text-emerald-500 block mt-0.5 font-medium">Empresas adimplentes</span>
              </div>
            </div>

            {/* Total Tenants */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-indigo-950/40 border border-indigo-850/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Building size={20} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Clientes Totais</span>
                <span className="text-xl font-bold text-white">{metrics.totalTenants} empresas</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">CNPJs registrados no banco</span>
              </div>
            </div>

            {/* Expired Trials */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-rose-950/40 border border-rose-850/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Inadimplentes (Bloqueados)</span>
                <span className="text-xl font-bold text-white">{metrics.expiredTrials} contas</span>
                <span className="text-[9px] text-rose-400 block mt-0.5">Bloqueio automático ativo</span>
              </div>
            </div>

            {/* Active Trials */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-emerald-950/40 border border-emerald-850/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Users size={20} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Trials Ativos</span>
                <span className="text-xl font-bold text-white">{metrics.activeTrials} demo</span>
                <span className="text-[9px] text-emerald-500 block mt-0.5">Dentro do prazo grátis</span>
              </div>
            </div>

          </div>
        )}

        {/* Dynamic Growth Trend chart & blocked tenants */}
        {metrics && chartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-3xl shadow-sm lg:col-span-2 flex flex-col h-[280px]">
              <div className="mb-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-primary" />
                  Evolução do Faturamento SaaS (MRR)
                </h3>
                <p className="text-[9px] text-slate-500">Estimativa baseada em contratos ativos e pagamentos mensais recorrentes</p>
              </div>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSaasMrrPro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ fontSize: 10, borderRadius: 12, backgroundColor: '#020617', borderColor: '#1e293b', color: '#fff' }} />
                    <Area type="monotone" dataKey="mrr" stroke="#7C3AED" strokeWidth={2} fillOpacity={1} fill="url(#colorSaasMrrPro)" name="MRR (R$)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col h-[280px]">
              <div className="mb-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Planos Ativos</h3>
                <p className="text-[9px] text-slate-500">Fatia de empresas em cada modalidade</p>
              </div>
              <div className="flex-1 w-full min-h-0 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Starter', value: metrics.plans.starter },
                        { name: 'Pro', value: metrics.plans.pro },
                        { name: 'Enterprise', value: metrics.plans.enterprise },
                        { name: 'Trial', value: metrics.plans.trial }
                      ].filter(p => p.value > 0)}
                      cx="50%"
                      cy="45%"
                      innerRadius={42}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {[
                        <Cell key="c1" fill="#7C3AED" />,
                        <Cell key="c2" fill="#10B981" />,
                        <Cell key="c3" fill="#3B82F6" />,
                        <Cell key="c4" fill="#F59E0B" />
                      ]}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} empresas`} contentStyle={{ fontSize: 10, backgroundColor: '#020617', borderColor: '#1e293b', color: '#fff' }} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Master client invoices database */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="text-primary" size={18} /> Histórico Geral de Faturamento & CNPJs
            </h2>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
                <input
                  type="text"
                  placeholder="Buscar Empresa, CNPJ ou Fatura..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-900 border border-slate-800 focus:border-primary rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none w-64"
                />
              </div>
              
              <div className="flex gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                {[
                  { id: 'all', label: 'Todas' },
                  { id: 'pending', label: 'Pendentes' },
                  { id: 'paid', label: 'Pagas' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === tab.id 
                        ? 'bg-primary text-white' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-350">
              <thead className="bg-slate-900/40 text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Fatura</th>
                  <th className="px-4 py-3">Empresa (Inquilino)</th>
                  <th className="px-4 py-3">CNPJ</th>
                  <th className="px-4 py-3">Período</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-r-xl text-center">Ações Operacionais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500 font-medium">Nenhuma fatura encontrada.</td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const formattedValue = (inv.totalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    const periodStr = `${new Date(inv.billingPeriodStart).toLocaleDateString('pt-BR')} a ${new Date(inv.billingPeriodEnd).toLocaleDateString('pt-BR')}`;
                    const isOverdue = inv.status === 'open' && new Date(inv.dueDate) < new Date();
                    
                    return (
                      <tr key={inv.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-300">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">{inv.tenant?.name || 'Desconhecido'}</div>
                          <div className="text-[9px] text-slate-500 font-mono">ID: {inv.tenantId}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400">{inv.tenant?.document || 'N/A'}</td>
                        <td className="px-4 py-3 text-[10px] text-slate-400">{periodStr}</td>
                        <td className="px-4 py-3 font-mono text-slate-400">{new Date(inv.dueDate).toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-3 font-semibold text-white">{formattedValue}</td>
                        <td className="px-4 py-3">
                          {inv.status === 'paid' ? (
                            <span className="bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider">
                              PAGA
                            </span>
                          ) : isOverdue ? (
                            <span className="bg-rose-500/10 text-rose-450 border border-rose-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider">
                              VENCIDA
                            </span>
                          ) : (
                            <span className="bg-amber-500/10 text-amber-450 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider">
                              ABERTA
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-2">
                            {inv.status !== 'paid' && (
                              <>
                                <button
                                  onClick={() => handleInvoiceAction(inv.id, 'confirm')}
                                  disabled={actionLoadingId === inv.id}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  {actionLoadingId === inv.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />}
                                  <span>Confirmar Baixa</span>
                                </button>
                                
                                <button
                                  onClick={() => handleInvoiceAction(inv.id, 'confidence')}
                                  disabled={actionLoadingId === inv.id}
                                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  title="Libera acesso comercial por 3 dias em confiança até o pagamento"
                                >
                                  {actionLoadingId === inv.id ? <Loader2 size={10} className="animate-spin" /> : <Clock size={10} />}
                                  <span>Tolerância 3 dias</span>
                                </button>
                              </>
                            )}
                            
                            {inv.status === 'paid' && (
                              <span className="text-[10px] text-slate-500 font-medium">Processado</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
