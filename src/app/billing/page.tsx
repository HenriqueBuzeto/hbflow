'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { 
  ShieldCheck, 
  HelpCircle, 
  ArrowRight, 
  QrCode, 
  Copy, 
  Check, 
  Loader2, 
  Sparkles, 
  Building, 
  Percent, 
  Ticket, 
  AlertTriangle,
  CreditCard
} from 'lucide-react';

export default function BillingPage() {
  const router = useRouter();
  const { currentTenantId, tenants } = useStore();
  
  // Expiration Status state
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [accessInfo, setAccessInfo] = useState<any>(null);
  
  // Checkout flow states
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  // Payment states
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<any>(null);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Fetch subscription, plans and current invoice
  const initBilling = async () => {
    try {
      // 1. Fetch Subscription & Access
      const subRes = await fetch('/api/v1/billing/subscription');
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscriptionInfo(subData.subscription);
        setAccessInfo(subData.access);
      }

      // 2. Fetch Plans
      const plansRes = await fetch('/api/v1/billing/plans');
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.plans || []);
        if (plansData.plans?.length > 0) {
          setSelectedPlan(plansData.plans[0]); // default to first plan (Starter)
        }
      }

      // 3. Fetch Current Invoice
      const invRes = await fetch('/api/v1/billing/invoices/current');
      if (invRes.ok) {
        const invData = await invRes.json();
        setCurrentInvoice(invData.invoice);
      }
    } catch (err) {
      console.error('Failed to load billing status:', err);
    }
  };

  useEffect(() => {
    initBilling();
  }, []);

  // Update selected plan
  const handlePlanChange = (plan: any) => {
    setSelectedPlan(plan);
    setCheckoutResult(null);
    setCouponError('');
    setCouponSuccess('');
  };

  // Apply discount coupon or trigger discount simulation
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setIsApplyingCoupon(true);
    setCouponError('');
    setCouponSuccess('');

    try {
      // Se tivermos uma fatura atual aberta, podemos simular aplicando a ela
      if (!currentInvoice) {
        // Criar uma fatura aberta temporária para o plano selecionado
        const start = new Date();
        const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        const genRes = await fetch('/api/v1/admin/billing/invoices/generate-monthly', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: currentTenantId,
            billingPeriodStart: start.toISOString(),
            billingPeriodEnd: end.toISOString(),
            couponCode: couponCode.trim().toUpperCase()
          })
        });

        const genData = await genRes.json();
        if (!genRes.ok) {
          throw new Error(genData.error || 'Erro ao aplicar cupom/gerar fatura.');
        }

        setCurrentInvoice(genData.invoice);
        setCouponSuccess(`Cupom "${couponCode.toUpperCase()}" aplicado com sucesso!`);
      } else {
        // Se já existe fatura aberta, regenera informando o cupom
        const genRes = await fetch('/api/v1/admin/billing/invoices/generate-monthly', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: currentTenantId,
            billingPeriodStart: currentInvoice.billingPeriodStart,
            billingPeriodEnd: currentInvoice.billingPeriodEnd,
            couponCode: couponCode.trim().toUpperCase()
          })
        });

        const genData = await genRes.json();
        if (!genRes.ok) {
          throw new Error(genData.error || 'Erro ao aplicar cupom.');
        }

        setCurrentInvoice(genData.invoice);
        setCouponSuccess(`Cupom "${couponCode.toUpperCase()}" aplicado com sucesso!`);
      }
    } catch (err: any) {
      setCouponError(err.message || 'Cupom inválido ou expirado.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // Generate PIX qr code or activate instantly if total is 0
  const handleCheckout = async () => {
    if (!selectedPlan) return;
    setIsProcessingCheckout(true);
    setGlobalError('');

    try {
      let activeInvoice = currentInvoice;

      // Se não houver fatura ativa aberta, gera uma nova mensalidade
      if (!activeInvoice || activeInvoice.status === 'paid') {
        const start = new Date();
        const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        const genRes = await fetch('/api/v1/admin/billing/invoices/generate-monthly', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: currentTenantId,
            billingPeriodStart: start.toISOString(),
            billingPeriodEnd: end.toISOString(),
            couponCode: couponCode || undefined
          })
        });

        const genData = await genRes.json();
        if (!genRes.ok) {
          throw new Error(genData.error || 'Erro ao gerar fatura.');
        }
        activeInvoice = genData.invoice;
        setCurrentInvoice(genData.invoice);
      }

      // Se a fatura gerada/existente já for paga (totalCents = 0), ativa direto
      if (activeInvoice.status === 'paid' || activeInvoice.totalCents === 0) {
        await initBilling();
        router.push('/dashboard');
        return;
      }

      // Requisitar cobrança Pix
      const res = await fetch(`/api/v1/billing/invoices/${activeInvoice.id}/pix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar cobrança Pix.');
      }

      setCheckoutResult(data.pixCharge);
    } catch (err: any) {
      setGlobalError(err.message || 'Falha ao processar checkout.');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Confirm simulated PIX payment
  const handleConfirmPayment = async () => {
    if (!checkoutResult || !currentInvoice) return;
    setIsConfirmingPayment(true);
    setGlobalError('');

    try {
      // Obter pagamento ID do checkoutResult
      const paymentId = checkoutResult.paymentId;

      const res = await fetch(`/api/v1/admin/billing/payments/${paymentId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents: checkoutResult.amountCents })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao confirmar pagamento.');
      }

      // Play chime
      try {
        const { playNotificationSound } = await import('@/store/useStore');
        playNotificationSound();
      } catch (soundErr) {
        console.warn(soundErr);
      }

      await initBilling();
      router.push('/dashboard');
    } catch (err: any) {
      setGlobalError(err.message || 'Falha ao confirmar pagamento. Tente novamente.');
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const handleCopyPayload = () => {
    if (!checkoutResult) return;
    navigator.clipboard.writeText(checkoutResult.copyPasteCode);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const currentTenant = tenants.find(t => t.id === currentTenantId) || tenants[0] || { name: 'Empresa' };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-900 px-4 py-8 relative overflow-hidden always-dark text-slate-100 font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />

      {/* Header */}
      <header className="max-w-6xl mx-auto w-full z-10 flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <img src="/logo hbflow.png" alt="HBFlow Logo" className="h-10 object-contain" />
          <span className="text-slate-500 text-sm font-semibold">|</span>
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Planos e Assinatura</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block">Empresa</span>
          <span className="text-xs font-bold text-white block">{currentTenant.name}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start flex-1">
        
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Expiration Notice Alert */}
          {accessInfo && !accessInfo.hasAccess && (
            <div className="bg-rose-950/20 border border-rose-500/30 rounded-3xl p-5 flex items-start gap-4 shadow-lg">
              <div className="p-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Assinatura Suspensa ou Expirada</h3>
                <p className="text-xs text-rose-350 leading-relaxed font-medium">
                  Seu período de acesso ao sistema expirou em {accessInfo.currentPeriodEnd ? new Date(accessInfo.currentPeriodEnd).toLocaleDateString('pt-BR') : 'data indefinida'}. Para liberar o acesso do seu tenant comercial, realize o pagamento ou aplique um cupom de isenção.
                </p>
              </div>
            </div>
          )}

          {/* Plan cards list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan: any) => (
              <div 
                key={plan.id}
                onClick={() => handlePlanChange(plan)}
                className={`bg-slate-950/80 border rounded-3xl p-6 shadow-xl flex flex-col justify-between h-[300px] transition-all cursor-pointer relative overflow-hidden group hover:border-slate-600 ${
                  selectedPlan?.id === plan.id 
                    ? 'border-primary ring-2 ring-primary/20 bg-slate-950' 
                    : 'border-slate-800'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Plano de Acesso</span>
                    {selectedPlan?.id === plan.id && (
                      <span className="bg-primary/25 border border-primary/40 text-primary text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                        Selecionado
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-white group-hover:text-primary transition-colors">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">R$ {(plan.priceCents / 100).toFixed(2)}</span>
                    <span className="text-slate-500 text-xs font-semibold">/ {plan.billingCycle === 'monthly' ? 'mês' : 'ano'}</span>
                  </div>
                  
                  <ul className="mt-5 space-y-2 text-xs text-slate-400 font-medium">
                    <li className="flex items-center gap-2">🟢 <span>Infraestrutura Multi-Tenant</span></li>
                    <li className="flex items-center gap-2">🟢 <span>Suporte a Atendimento via PIX</span></li>
                    <li className="flex items-center gap-2">🟢 <span>Controle de Acesso Automatizado</span></li>
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Coupon Input Form */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Ticket size={14} className="text-primary" />
              Aplicar Cupom Promocional
            </h4>
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: CUPOM100 ou HB20"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 focus:border-primary rounded-xl px-4 py-2 text-xs outline-none uppercase font-mono tracking-wider text-slate-200"
              />
              <button
                type="submit"
                disabled={isApplyingCoupon}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 border border-slate-700/40"
              >
                {isApplyingCoupon ? <Loader2 size={13} className="animate-spin" /> : 'Validar'}
              </button>
            </form>
            
            {couponError && <p className="text-[10px] text-rose-550 font-bold mt-2 font-mono">{couponError}</p>}
            {couponSuccess && <p className="text-[10px] text-emerald-400 font-bold mt-2 font-mono">{couponSuccess}</p>}
          </div>

        </div>

        {/* Right 1 Column - Invoice summary */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-800">
            Resumo do Pedido
          </h4>

          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between text-slate-400 font-medium">
              <span>Mensalidade ({selectedPlan ? selectedPlan.name : 'Nenhum'})</span>
              <span className="font-mono">R$ {selectedPlan ? (selectedPlan.priceCents / 100).toFixed(2) : '0.00'}</span>
            </div>

            {currentInvoice && currentInvoice.discountCents > 0 && (
              <div className="flex justify-between text-emerald-400 font-bold bg-emerald-950/10 p-2.5 rounded-xl border border-emerald-950/30">
                <span className="flex items-center gap-1"><Percent size={12} /> Desconto Aplicado</span>
                <span className="font-mono">-R$ {(currentInvoice.discountCents / 100).toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-slate-900">
              <span>Valor Total</span>
              <span className="font-mono text-primary">
                R$ {currentInvoice ? (currentInvoice.totalCents / 100).toFixed(2) : selectedPlan ? (selectedPlan.priceCents / 100).toFixed(2) : '0.00'}
              </span>
            </div>
          </div>

          {!checkoutResult && (
            <button
              onClick={handleCheckout}
              disabled={isProcessingCheckout || !selectedPlan}
              className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white py-3.5 rounded-2xl font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessingCheckout ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <span>Pagar com Pix</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          )}

          {checkoutResult && (
            <div className="space-y-4 pt-4 border-t border-slate-800 animate-scale-in">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-3">
                <div className="bg-white p-3 rounded-2xl w-40 h-40 flex items-center justify-center shadow">
                  <QrCode size={120} className="text-slate-900" />
                </div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  QR Code PIX Gerado
                </span>
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Código Copia e Cola
                </label>
                <div className="flex bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 items-center">
                  <input
                    type="text"
                    readOnly
                    value={checkoutResult.copyPasteCode}
                    className="bg-transparent border-none text-[10px] text-slate-350 select-all font-mono outline-none flex-1 truncate"
                  />
                  <button
                    onClick={handleCopyPayload}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedPayload ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              {globalError && (
                <p className="text-[10px] text-rose-500 font-bold bg-rose-500/10 p-2 rounded border border-rose-500/20">{globalError}</p>
              )}

              <button
                onClick={handleConfirmPayment}
                disabled={isConfirmingPayment}
                className="w-full bg-emerald-650 hover:bg-emerald-550 disabled:bg-emerald-655/50 text-white py-3.5 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                {isConfirmingPayment ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Processando confirmação...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={13} />
                    <span>Confirmar Pagamento</span>
                  </>
                )}
              </button>
            </div>
          )}

          <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-800/60 flex items-start gap-2">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-[9.5px] text-slate-500 leading-relaxed font-medium">
              A renovação e cálculo do acesso comercial do HBFlow via Pix é instantânea.
            </p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full z-10 text-center text-slate-600 text-[10px] pt-6 border-t border-slate-800 mt-8 flex justify-between items-center">
        <span>© 2026 HBFlow. Todos os direitos reservados.</span>
        <span className="flex items-center gap-1">Suporte Comercial <HelpCircle size={10} /></span>
      </footer>
    </div>
  );
}
