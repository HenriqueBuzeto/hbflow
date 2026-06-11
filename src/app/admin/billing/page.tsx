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
  ShieldCheck 
} from 'lucide-react';

export default function AdminBillingPage() {
  const { currentTenantId } = useStore();
  
  // Lists
  const [plans, setPlans] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);

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
