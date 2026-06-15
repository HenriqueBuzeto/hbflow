'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { 
  Building, 
  Percent, 
  Ticket, 
  Sparkles, 
  Loader2, 
  Plus, 
  Trash, 
  ShieldCheck,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Users,
  Activity
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

export default function AdminBillingPage() {
  const { currentTenantId } = useStore();
  
  // Lists
  const [plans, setPlans] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [blockedTenants, setBlockedTenants] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Form states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create Plan Form
  const [newPlan, setNewPlan] = useState({
    name: '',
    slug: '',
    priceCents: 0,
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    featuresJson: '{}'
  });

  // Create Coupon Form
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed_amount' | 'free_access',
    value: 0,
    duration: 'once' as 'once' | 'months' | 'forever'
  });

  // Create Tenant Discount Form
  const [newDiscount, setNewDiscount] = useState({
    tenantId: currentTenantId,
    type: 'percentage' as 'percentage' | 'fixed_amount' | 'free_access',
    value: 0,
    reason: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);

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

      // Load plans
      const pRes = await fetch('/api/v1/billing/plans');
      if (pRes.ok) {
        const pData = await pRes.json();
        setPlans(pData.plans || []);
      }

      // Load coupons
      const cRes = await fetch('/api/v1/admin/billing/coupons');
      if (cRes.ok) {
        const cData = await cRes.json();
        setCoupons(cData.coupons || []);
      }

      // Load discounts
      const dRes = await fetch(`/api/v1/admin/tenants/${currentTenantId}/discounts`);
      if (dRes.ok) {
        const dData = await dRes.json();
        setDiscounts(dData.discounts || []);
      }
    } catch (err: any) {
      setError('Erro ao carregar dados do admin de faturamento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/v1/admin/billing/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlan)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar plano');
      setSuccess('Plano criado com sucesso!');
      setNewPlan({ name: '', slug: '', priceCents: 0, billingCycle: 'monthly', featuresJson: '{}' });
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/v1/admin/billing/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCoupon)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar cupom');
      setSuccess('Cupom criado com sucesso!');
      setNewCoupon({ code: '', type: 'percentage', value: 0, duration: 'once' });
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/v1/admin/tenants/${newDiscount.tenantId}/discounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDiscount)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao aplicar desconto');
      setSuccess('Desconto aplicado com sucesso!');
      setNewDiscount({ tenantId: currentTenantId, type: 'percentage', value: 0, reason: '' });
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteDiscount = async (discountId: string) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/v1/admin/tenants/${currentTenantId}/discounts/${discountId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao remover desconto');
      setSuccess('Desconto removido com sucesso!');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/v1/admin/billing/coupons/${couponId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir cupom');
      setSuccess('Cupom inativado com sucesso!');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans always-dark">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldCheck className="text-primary" /> Admin Faturamento
            </h1>
            <span className="text-slate-500">/</span>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Painel Administrativo</span>
          </div>
          {loading && <Loader2 className="animate-spin text-slate-500" size={18} />}
        </div>

        {error && <div className="bg-rose-950/20 border border-rose-500/20 text-rose-350 p-4 rounded-xl text-xs font-bold font-mono">{error}</div>}
        {success && <div className="bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs font-bold font-mono">{success}</div>}

        {/* Metrics Overview Cards */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* MRR */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-violet-950/40 border border-violet-800/35 flex items-center justify-center text-primary shrink-0">
                <DollarSign size={20} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">MRR Acumulado</span>
                <span className="text-xl font-bold text-white">
                  {metrics.mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[9px] text-emerald-500 block mt-0.5 font-medium">Assinaturas Ativas</span>
              </div>
            </div>

            {/* Total Tenants */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-indigo-950/40 border border-indigo-800/35 flex items-center justify-center text-indigo-400 shrink-0">
                <Building size={20} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Total de Contas</span>
                <span className="text-xl font-bold text-white">{metrics.totalTenants} empresas</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Inquilinos cadastrados</span>
              </div>
            </div>

            {/* Active Trials */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-emerald-950/40 border border-emerald-800/35 flex items-center justify-center text-emerald-400 shrink-0">
                <Users size={20} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Trials Ativos</span>
                <span className="text-xl font-bold text-white">{metrics.activeTrials} demo</span>
                <span className="text-[9px] text-emerald-500 block mt-0.5">Em período experimental</span>
              </div>
            </div>

            {/* Expired Trials */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-rose-950/40 border border-rose-800/35 flex items-center justify-center text-rose-450 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Trials Expirados</span>
                <span className="text-xl font-bold text-white">{metrics.expiredTrials} contas</span>
                <span className="text-[9px] text-rose-400 block mt-0.5">Bloqueados na tolerância</span>
              </div>
            </div>

            {/* Churn / Bloqueios */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-rose-950/40 border border-rose-800/35 flex items-center justify-center text-rose-450 shrink-0">
                <Percent size={20} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Taxa de Bloqueio</span>
                <span className="text-xl font-bold text-white">{metrics.churnRate}%</span>
                <span className="text-[9px] text-rose-400 block mt-0.5">Inquilinos inadimplentes</span>
              </div>
            </div>

          </div>
        )}

        {/* Growth & Distribution Charts */}
        {metrics && chartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart: MRR Growth Trend */}
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
                      <linearGradient id="colorSaasMrr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ fontSize: 10, borderRadius: 12, backgroundColor: '#020617', borderColor: '#1e293b', color: '#fff' }} />
                    <Area type="monotone" dataKey="mrr" stroke="#7C3AED" strokeWidth={2} fillOpacity={1} fill="url(#colorSaasMrr)" name="MRR (R$)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart: Plans Distribution Pie */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col h-[280px]">
              <div className="mb-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Distribuição por Plano</h3>
                <p className="text-[9px] text-slate-500">Volume de empresas ativas em cada categoria</p>
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

        {/* Delinquency / Blocked Tenants Table */}
        {blockedTenants.length > 0 && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-black uppercase text-rose-400 tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={15} /> Inquilinos Bloqueados (Inadimplentes)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-350">
                <thead className="bg-slate-900/40 text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Empresa</th>
                    <th className="px-4 py-3">Slug</th>
                    <th className="px-4 py-3">Plano</th>
                    <th className="px-4 py-3">Data de Registro</th>
                    <th className="px-4 py-3 rounded-r-xl text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {blockedTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">{tenant.name}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{tenant.slug}</td>
                      <td className="px-4 py-3 capitalize">
                        <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider">
                          {tenant.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">{new Date(tenant.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={async () => {
                            if (!confirm(`Reativar acesso para ${tenant.name}?`)) return;
                            try {
                              const res = await fetch(`/api/v1/admin/tenants/${tenant.id}/subscription/activate`, {
                                method: 'POST'
                              });
                              const data = await res.json();
                              if (res.ok && data.success) {
                                setSuccess(`Assinatura de ${tenant.name} reativada com sucesso!`);
                                loadData();
                              } else {
                                throw new Error(data.error || 'Erro ao reativar assinatura');
                              }
                            } catch (err: any) {
                              setError(err.message);
                            }
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
                        >
                          Desbloquear / Reativar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3 Forms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Form 1: Planos */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-primary" /> Criar Novo Plano
            </h3>
            <form onSubmit={handleCreatePlan} className="space-y-3">
              <input
                type="text"
                placeholder="Nome (Ex: Pro Enterprise)"
                value={newPlan.name}
                onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                className="w-full bg-slate-900 border border-slate-800 focus:border-primary rounded-xl px-4 py-2 text-xs outline-none"
                required
              />
              <input
                type="text"
                placeholder="Slug (Ex: pro)"
                value={newPlan.slug}
                onChange={(e) => setNewPlan({...newPlan, slug: e.target.value})}
                className="w-full bg-slate-900 border border-slate-800 focus:border-primary rounded-xl px-4 py-2 text-xs outline-none"
                required
              />
              <input
                type="number"
                placeholder="Preço em centavos (Ex: 34900)"
                value={newPlan.priceCents || ''}
                onChange={(e) => setNewPlan({...newPlan, priceCents: parseInt(e.target.value) || 0})}
                className="w-full bg-slate-900 border border-slate-800 focus:border-primary rounded-xl px-4 py-2 text-xs outline-none"
                required
              />
              <select
                value={newPlan.billingCycle}
                onChange={(e: any) => setNewPlan({...newPlan, billingCycle: e.target.value})}
                className="w-full bg-slate-900 border border-slate-800 focus:border-primary rounded-xl px-4 py-2 text-xs outline-none text-slate-400"
              >
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
              </select>
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={13} />
                <span>Salvar Plano</span>
              </button>
            </form>
          </div>

          {/* Form 2: Cupons */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <Ticket size={14} className="text-primary" /> Criar Novo Cupom
            </h3>
            <form onSubmit={handleCreateCoupon} className="space-y-3">
              <input
                type="text"
                placeholder="Código (Ex: CUPOM100)"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                className="w-full bg-slate-900 border border-slate-800 focus:border-primary rounded-xl px-4 py-2 text-xs outline-none uppercase font-mono"
                required
              />
              <select
                value={newCoupon.type}
                onChange={(e: any) => setNewCoupon({...newCoupon, type: e.target.value})}
                className="w-full bg-slate-900 border border-slate-800 focus:border-primary rounded-xl px-4 py-2 text-xs outline-none text-slate-400"
              >
                <option value="percentage">Porcentagem</option>
                <option value="fixed_amount">Valor Fixo (Centavos)</option>
                <option value="free_access">Acesso Grátis 100%</option>
              </select>
              <input
                type="number"
                placeholder="Valor (Ex: 20 para 20% ou 1000 para R$10)"
                value={newCoupon.value || ''}
                onChange={(e) => setNewCoupon({...newCoupon, value: parseFloat(e.target.value) || 0})}
                className="w-full bg-slate-900 border border-slate-800 focus:border-primary rounded-xl px-4 py-2 text-xs outline-none"
                required
              />
              <select
                value={newCoupon.duration}
                onChange={(e: any) => setNewCoupon({...newCoupon, duration: e.target.value})}
                className="w-full bg-slate-900 border border-slate-800 focus:border-primary rounded-xl px-4 py-2 text-xs outline-none text-slate-400"
              >
                <option value="once">Uma vez</option>
                <option value="months">Meses</option>
                <option value="forever">Vitalício</option>
              </select>
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={13} />
                <span>Salvar Cupom</span>
              </button>
            </form>
          </div>

          {/* Form 3: Descontos Inquilino */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <Building size={14} className="text-primary" /> Aplicar Cortesia/Desconto
            </h3>
            <form onSubmit={handleCreateDiscount} className="space-y-3">
              <input
                type="text"
                placeholder="Tenant ID (UUID)"
                value={newDiscount.tenantId}
                onChange={(e) => setNewDiscount({...newDiscount, tenantId: e.target.value})}
                className="w-full bg-slate-900 border border-slate-800 focus:border-primary rounded-xl px-4 py-2 text-xs outline-none font-mono text-[10px]"
                required
              />
              <select
                value={newDiscount.type}
                onChange={(e: any) => setNewDiscount({...newDiscount, type: e.target.value})}
                className="w-full bg-slate-900 border border-slate-800 focus:border-primary rounded-xl px-4 py-2 text-xs outline-none text-slate-400"
              >
                <option value="percentage">Porcentagem</option>
                <option value="fixed_amount">Valor Fixo (Centavos)</option>
                <option value="free_access">Acesso Grátis 100%</option>
              </select>
              <input
                type="number"
                placeholder="Valor (Ex: 100 para 100%)"
                value={newDiscount.value || ''}
                onChange={(e) => setNewDiscount({...newDiscount, value: parseFloat(e.target.value) || 0})}
                className="w-full bg-slate-900 border border-slate-800 focus:border-primary rounded-xl px-4 py-2 text-xs outline-none"
                required
              />
              <input
                type="text"
                placeholder="Motivo (Ex: Cortesia de onboarding)"
                value={newDiscount.reason}
                onChange={(e) => setNewDiscount({...newDiscount, reason: e.target.value})}
                className="w-full bg-slate-900 border border-slate-800 focus:border-primary rounded-xl px-4 py-2 text-xs outline-none"
                required
              />
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={13} />
                <span>Aplicar Desconto</span>
              </button>
            </form>
          </div>

        </div>

        {/* Listings section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          
          {/* Coupons List */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
              <Ticket size={13} className="text-slate-450" /> Cupons Registrados
            </h3>
            <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-2">
              {coupons.length === 0 ? (
                <p className="text-[10px] text-slate-500 font-medium">Nenhum cupom ativo registrado.</p>
              ) : (
                coupons.map((coupon) => (
                  <div key={coupon.id} className="flex justify-between items-center bg-slate-900 border border-slate-800/60 p-3 rounded-2xl text-xs">
                    <span className="font-mono font-bold tracking-wider text-slate-350">{coupon.code}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400">{coupon.type === 'free_access' ? 'Isenção 100%' : `${coupon.value}%`}</span>
                      <button 
                        onClick={() => handleDeleteCoupon(coupon.id)}
                        className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Manual Discounts List */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
              <Building size={13} className="text-slate-450" /> Descontos Manuais Ativos (Este Tenant)
            </h3>
            <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-2">
              {discounts.length === 0 ? (
                <p className="text-[10px] text-slate-500 font-medium">Nenhum desconto manual aplicado.</p>
              ) : (
                discounts.map((d) => (
                  <div key={d.id} className="flex justify-between items-center bg-slate-900 border border-slate-800/60 p-3 rounded-2xl text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-300 capitalize">{d.type === 'free_access' ? 'Cortesia 100%' : `${d.value}%`}</span>
                      <span className="text-[10px] text-slate-500 block">Motivo: {d.reason}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteDiscount(d.id)}
                      className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer"
                    >
                      <Trash size={12} />
                    </button>
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
