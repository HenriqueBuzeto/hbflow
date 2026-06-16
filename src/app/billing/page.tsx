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
  const { currentTenantId, tenants, fetchUsers } = useStore();
  
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [activatedPlanName, setActivatedPlanName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'infinitepay' | 'pix' | 'credit_card' | 'boleto'>('infinitepay');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [boletoResult, setBoletoResult] = useState<any>(null);
  const [copiedBoleto, setCopiedBoleto] = useState(false);
 
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
    const loadStoreAndBilling = async () => {
      await fetchUsers();
      await initBilling();
    };
    loadStoreAndBilling();
  }, [fetchUsers]);

  // Update selected plan
  const handlePlanChange = (plan: any) => {
    setSelectedPlan(plan);
    setCheckoutResult(null);
    setBoletoResult(null);
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

    const targetTenantId = currentTenantId || useStore.getState().currentTenantId;

    try {
      // Se tivermos uma fatura atual aberta correspondente ao plano selecionado, podemos aplicar a ela
      const invoiceMatchesSelected = currentInvoice && 
        (currentInvoice.subscription?.plan?.slug === selectedPlan?.slug);

      if (!invoiceMatchesSelected) {
        // Criar uma fatura aberta temporária para o plano selecionado
        const start = new Date();
        const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        const genRes = await fetch('/api/v1/admin/billing/invoices/generate-monthly', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: targetTenantId,
            billingPeriodStart: start.toISOString(),
            billingPeriodEnd: end.toISOString(),
            couponCode: couponCode.trim().toUpperCase(),
            planSlug: selectedPlan?.slug
          })
        });

        const genData = await genRes.json();
        if (!genRes.ok) {
          throw new Error(genData.error || 'Erro ao aplicar cupom/gerar fatura.');
        }

        setCurrentInvoice(genData.invoice);
        setCouponSuccess(`Cupom "${couponCode.toUpperCase()}" aplicado com sucesso!`);
      } else {
        // Se já existe fatura aberta do mesmo plano, regenera informando o cupom
        const genRes = await fetch('/api/v1/admin/billing/invoices/generate-monthly', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: targetTenantId,
            billingPeriodStart: currentInvoice.billingPeriodStart,
            billingPeriodEnd: currentInvoice.billingPeriodEnd,
            couponCode: couponCode.trim().toUpperCase(),
            planSlug: selectedPlan?.slug
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

  // Generate payment method checkout or activate instantly if total is 0
  const handleCheckout = async () => {
    if (!selectedPlan) return;
    setIsProcessingCheckout(true);
    setGlobalError('');

    const targetTenantId = currentTenantId || useStore.getState().currentTenantId;

    try {
      let activeInvoice = currentInvoice;

      // Se a fatura ativa aberta for para um plano diferente do selecionado,
      // ou se não houver fatura, força a geração de uma nova fatura
      const invoiceMatchesSelected = activeInvoice && 
        (activeInvoice.subscription?.plan?.slug === selectedPlan.slug);

      // Se não houver fatura ativa aberta, ou for de outro plano, gera uma nova mensalidade.
      // Se a fatura ativa já corresponder ao plano selecionado e estiver paga, não gera outra fatura duplicada.
      if (!invoiceMatchesSelected || (activeInvoice?.status === 'paid' && activeInvoice.subscription?.plan?.slug !== selectedPlan.slug)) {
        const start = new Date();
        const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        const genRes = await fetch('/api/v1/admin/billing/invoices/generate-monthly', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: targetTenantId,
            billingPeriodStart: start.toISOString(),
            billingPeriodEnd: end.toISOString(),
            couponCode: couponCode || undefined,
            planSlug: selectedPlan?.slug
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
        setActivatedPlanName(selectedPlan.name);
        setShowSuccessModal(true);
        await initBilling();
        return;
      }

      // Processar conforme o método selecionado
      if (paymentMethod === 'infinitepay') {
        const res = await fetch(`/api/v1/billing/invoices/${activeInvoice.id}/infinitepay/link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao processar checkout InfinitePay.');
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
      }
      else if (paymentMethod === 'pix') {
        const res = await fetch(`/api/v1/billing/invoices/${activeInvoice.id}/pix`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao processar cobrança Pix.');
        setCheckoutResult(data.pixCharge);
      } 
      else if (paymentMethod === 'boleto') {
        const res = await fetch(`/api/v1/billing/invoices/${activeInvoice.id}/boleto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao emitir Boleto Bancário.');
        setBoletoResult(data);
      }
      else if (paymentMethod === 'credit_card') {
        if (!cardNumber || !cardHolder || !cardExpiry || !cardCvv) {
          throw new Error('Preencha todos os campos do cartão de crédito.');
        }
        const res = await fetch(`/api/v1/billing/invoices/${activeInvoice.id}/credit-card`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            number: cardNumber,
            holder: cardHolder,
            expiry: cardExpiry,
            cvv: cardCvv
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao processar Cartão de Crédito.');
        
        setActivatedPlanName(selectedPlan.name);
        setShowSuccessModal(true);
        await initBilling();
      }
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
      const paymentId = checkoutResult.paymentId;
      const res = await fetch(`/api/v1/admin/billing/payments/${paymentId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents: checkoutResult.amountCents })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao confirmar pagamento.');

      try {
        const { playNotificationSound } = await import('@/store/useStore');
        playNotificationSound();
      } catch (soundErr) {
        console.warn(soundErr);
      }

      setActivatedPlanName(selectedPlan.name);
      setShowSuccessModal(true);
      await initBilling();
    } catch (err: any) {
      setGlobalError(err.message || 'Falha ao confirmar pagamento. Tente novamente.');
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  // Confirm simulated BOLETO payment
  const handleConfirmBoletoPayment = async () => {
    if (!boletoResult || !currentInvoice) return;
    setIsConfirmingPayment(true);
    setGlobalError('');

    try {
      const paymentId = boletoResult.paymentId;
      const res = await fetch(`/api/v1/admin/billing/payments/${paymentId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents: boletoResult.amountCents })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao confirmar pagamento do boleto.');

      try {
        const { playNotificationSound } = await import('@/store/useStore');
        playNotificationSound();
      } catch (soundErr) {
        console.warn(soundErr);
      }

      setActivatedPlanName(selectedPlan.name);
      setShowSuccessModal(true);
      await initBilling();
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

  const handleCopyBoleto = () => {
    if (!boletoResult) return;
    navigator.clipboard.writeText(boletoResult.lineDigit);
    setCopiedBoleto(true);
    setTimeout(() => setCopiedBoleto(false), 2000);
  };

  const invoiceMatchesPlan = currentInvoice && selectedPlan && 
    (currentInvoice.subscription?.plan?.slug === selectedPlan.slug);

  const currentTenant = tenants.find(t => t.id === currentTenantId) || tenants[0] || { name: 'Empresa' };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-900 px-4 py-8 relative overflow-hidden always-dark text-slate-100 font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />

      {/* Header */}
      <header className="max-w-6xl mx-auto w-full z-10 flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-24 h-8 relative overflow-hidden flex items-center justify-center shrink-0">
            <img 
              src="/logo hbflow.png" 
              alt="HBFlow Logo" 
              className="absolute h-48 w-auto max-w-none object-contain" 
              style={{ top: '-80px', left: '-58px' }} 
            />
          </div>
          <span className="text-slate-500 text-sm font-semibold shrink-0">|</span>
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider shrink-0">Planos e Assinatura</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block">Empresa</span>
            <span className="text-xs font-bold text-white block">{currentTenant.name}</span>
          </div>
          <button
            onClick={() => router.push('/financeiro')}
            className="text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/40 px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Voltar ao Painel
          </button>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan: any) => (
              <div 
                key={plan.id}
                onClick={() => handlePlanChange(plan)}
                className={`bg-slate-950/80 border rounded-3xl p-6 shadow-xl flex flex-col justify-between h-[320px] transition-all cursor-pointer relative overflow-hidden group hover:border-slate-600 ${
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
                    {plan.slug === 'enterprise' ? (
                      <span className="text-xl font-black text-white">Valor a combinar</span>
                    ) : (
                      <>
                        <span className="text-2xl font-black text-white">R$ {(plan.priceCents / 100).toFixed(2)}</span>
                        <span className="text-slate-500 text-xs font-semibold">/ {plan.billingCycle === 'monthly' ? 'mês' : 'ano'}</span>
                      </>
                    )}
                  </div>
                  
                  <ul className="mt-5 space-y-2 text-xs text-slate-400 font-medium">
                    {plan.slug === 'starter' && (
                      <>
                        <li className="flex items-center gap-2">🟢 <span>1 Canal de WhatsApp</span></li>
                        <li className="flex items-center gap-2">🟢 <span>3 Atendentes Humanos</span></li>
                        <li className="flex items-center gap-2">🟢 <span>IA Triage, FAQ e Summary</span></li>
                      </>
                    )}
                    {plan.slug === 'pro' && (
                      <>
                        <li className="flex items-center gap-2">🟢 <span>2 Canais de WhatsApp</span></li>
                        <li className="flex items-center gap-2">🟢 <span>10 Atendentes Humanos</span></li>
                        <li className="flex items-center gap-2">🟢 <span>Agente SDR & Cobrança (IA)</span></li>
                        <li className="flex items-center gap-2">🟢 <span>Agente Follow-up Automático</span></li>
                      </>
                    )}
                    {plan.slug === 'enterprise' && (
                      <>
                        <li className="flex items-center gap-2">🟢 <span>Canais & Atendentes Ilimitados</span></li>
                        <li className="flex items-center gap-2">🟢 <span>Supervisor, Coach & Copilot IA</span></li>
                        <li className="flex items-center gap-2">🟢 <span>Relatórios Predict & Forecast IA</span></li>
                        <li className="flex items-center gap-2">🟢 <span>Suporte VIP & SLA Garantido</span></li>
                      </>
                    )}
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
                placeholder="Cupom de Desconto"
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

          {selectedPlan?.slug === 'enterprise' ? (
            <div className="space-y-4 text-xs">
              <p className="text-slate-350 leading-relaxed font-medium">
                O <strong>Plano Enterprise</strong> é personalizado sob demanda para grandes operações.
              </p>
              <p className="text-slate-400 leading-relaxed font-medium">
                Entre em contato com nossa equipe comercial para negociar os valores e obter uma proposta adequada à sua infraestrutura.
              </p>
              <a
                href="https://wa.me/5511998231142?text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20um%20or%C3%A7amento%20para%20o%20Plano%20Enterprise%20do%20HBFlow."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-2xl font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <span>Falar com o Comercial</span>
                <ArrowRight size={13} />
              </a>
            </div>
          ) : (
            <>
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between text-slate-400 font-medium">
                  <span>Mensalidade ({selectedPlan ? selectedPlan.name : 'Nenhum'})</span>
                  <span className="font-mono">R$ {selectedPlan ? (selectedPlan.priceCents / 100).toFixed(2) : '0.00'}</span>
                </div>

                {invoiceMatchesPlan && currentInvoice.discountCents > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold bg-emerald-950/10 p-2.5 rounded-xl border border-emerald-950/30">
                    <span className="flex items-center gap-1"><Percent size={12} /> Desconto Aplicado</span>
                    <span className="font-mono">-R$ {(currentInvoice.discountCents / 100).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-slate-900">
                  <span>Valor Total</span>
                  <span className="font-mono text-primary">
                    R$ {invoiceMatchesPlan ? (currentInvoice.totalCents / 100).toFixed(2) : selectedPlan ? (selectedPlan.priceCents / 100).toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>

              {/* Formas de Pagamento Selector Tabs (Only if not checked out yet) */}
              {!checkoutResult && !boletoResult && (
                <div className="space-y-2.5 pt-3.5 border-t border-slate-900">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Forma de Pagamento
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800/40">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('infinitepay');
                        setGlobalError('');
                      }}
                      className={`py-1.5 px-1 text-[9px] font-bold rounded-lg flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        paymentMethod === 'infinitepay'
                          ? 'bg-primary text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Sparkles size={12} className="text-amber-400" />
                      <span>Pix/Cartão Real</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('pix');
                        setGlobalError('');
                      }}
                      className={`py-1.5 px-1 text-[9px] font-bold rounded-lg flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        paymentMethod === 'pix'
                          ? 'bg-primary text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <QrCode size={12} />
                      <span>Pix Simulado</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('credit_card');
                        setGlobalError('');
                      }}
                      className={`py-1.5 px-1 text-[9px] font-bold rounded-lg flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        paymentMethod === 'credit_card'
                          ? 'bg-primary text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <CreditCard size={12} />
                      <span>Cartão Simulado</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('boleto');
                        setGlobalError('');
                      }}
                      className={`py-1.5 px-1 text-[9px] font-bold rounded-lg flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        paymentMethod === 'boleto'
                          ? 'bg-primary text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Ticket size={12} />
                      <span>Boleto Simulado</span>
                    </button>
                  </div>
                </div>
              )}

              {/* RENDER FORMA DE PAGAMENTO: INFINITEPAY */}
              {paymentMethod === 'infinitepay' && !checkoutResult && !boletoResult && (
                <div className="space-y-4 pt-2 animate-scale-in">
                  <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                    Você será redirecionado para a plataforma segura da <strong>InfinitePay</strong> para concluir seu pagamento via <strong>Pix ou Cartão de Crédito</strong> de forma real.
                  </p>
                  
                  {globalError && (
                    <p className="text-[10px] text-rose-550 font-bold bg-rose-500/10 p-2 rounded border border-rose-500/20">{globalError}</p>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={isProcessingCheckout || !selectedPlan}
                    className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white py-3.5 rounded-2xl font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isProcessingCheckout ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Gerando Link de Checkout...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} className="text-amber-400" />
                        <span>Pagar agora (InfinitePay)</span>
                        <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* RENDER FORMA DE PAGAMENTO: CARTÃO DE CRÉDITO */}
              {paymentMethod === 'credit_card' && !checkoutResult && !boletoResult && (
                <div className="space-y-4 pt-2 animate-scale-in">
                  {/* Visual Credit Card Simulator */}
                  <div className="w-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border border-slate-700/50 rounded-2xl p-4 relative overflow-hidden shadow-lg select-none min-h-[140px] flex flex-col justify-between text-white font-mono tracking-widest">
                    <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[60px]" />
                    
                    <div className="flex justify-between items-start">
                      <div className="w-8 h-6 bg-amber-500/20 border border-amber-500/30 rounded-md shrink-0 flex items-center justify-center">
                        <div className="w-6 h-4 border border-amber-500/40 rounded bg-amber-500/10" />
                      </div>
                      <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">
                        {cardNumber.startsWith('4') ? 'Visa' : cardNumber.startsWith('5') ? 'Mastercard' : cardNumber.startsWith('9999') ? 'Mock Card' : 'Cartão'}
                      </span>
                    </div>
                    
                    <div className="text-xs font-bold text-slate-200 py-2 text-center">
                      {cardNumber ? cardNumber.replace(/(\d{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
                    </div>
                    
                    <div className="flex justify-between items-end text-[8px] uppercase">
                      <div className="max-w-[70%]">
                        <span className="text-slate-500 text-[6px] font-bold block leading-none mb-0.5">Titular</span>
                        <span className="text-slate-300 truncate block max-w-full">{cardHolder || 'NOME DO TITULAR'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 text-[6px] font-bold block leading-none mb-0.5">Validade</span>
                        <span className="text-slate-300">{cardExpiry || 'MM/AA'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Número do Cartão (Simule 9999... p/ erro)"
                      maxLength={16}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-primary rounded-xl px-3 py-2 text-xs outline-none text-slate-200"
                    />
                    <input
                      type="text"
                      placeholder="Nome do Titular"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-primary rounded-xl px-3 py-2 text-xs outline-none text-slate-200 uppercase"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Validade (MM/AA)"
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '');
                          if (val.length > 2) {
                            val = `${val.slice(0,2)}/${val.slice(2,4)}`;
                          }
                          setCardExpiry(val);
                        }}
                        className="bg-slate-900 border border-slate-800 focus:border-primary rounded-xl px-3 py-2 text-xs outline-none text-slate-200"
                      />
                      <input
                        type="password"
                        placeholder="CVV"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                        className="bg-slate-900 border border-slate-800 focus:border-primary rounded-xl px-3 py-2 text-xs outline-none text-slate-200"
                      />
                    </div>
                  </div>

                  {globalError && (
                    <p className="text-[10px] text-rose-550 font-bold bg-rose-500/10 p-2 rounded border border-rose-500/20">{globalError}</p>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={isProcessingCheckout || !selectedPlan}
                    className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white py-3.5 rounded-2xl font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isProcessingCheckout ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Processando Transação...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard size={13} />
                        <span>Finalizar Pagamento com Cartão</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* RENDER FORMA DE PAGAMENTO: BOLETO BANCÁRIO */}
              {paymentMethod === 'boleto' && !checkoutResult && (
                <div className="space-y-4 pt-2 animate-scale-in">
                  {!boletoResult ? (
                    <>
                      <p className="text-[10px] text-slate-450 leading-relaxed font-medium">
                        O boleto bancário será gerado e terá o vencimento para 3 dias úteis. A liberação do plano Pro ocorre logo após o registro da compensação (ou confirmação manual abaixo).
                      </p>
                      <button
                        onClick={handleCheckout}
                        disabled={isProcessingCheckout || !selectedPlan}
                        className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white py-3.5 rounded-2xl font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isProcessingCheckout ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Gerando Boleto...</span>
                          </>
                        ) : (
                          <>
                            <Ticket size={13} />
                            <span>Emitir Boleto Bancário</span>
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="space-y-4 animate-scale-in">
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center space-y-1.5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
                        <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider">Boleto Registrado Itaú</span>
                        <div className="text-xs font-bold text-white font-mono tracking-widest pt-2">
                          {boletoResult.lineDigit.slice(0, 15)}...
                        </div>
                        <span className="text-[8px] text-slate-500 block">
                          Vencimento: {new Date(boletoResult.dueDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                          Linha Digitável (Código de Barras)
                        </label>
                        <div className="flex bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 items-center">
                          <input
                            type="text"
                            readOnly
                            value={boletoResult.lineDigit}
                            className="bg-transparent border-none text-[9px] text-slate-350 select-all font-mono outline-none flex-1 truncate"
                          />
                          <button
                            onClick={handleCopyBoleto}
                            className="p-1 text-slate-400 hover:text-white transition-colors"
                          >
                            {copiedBoleto ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>

                      {globalError && (
                        <p className="text-[10px] text-rose-550 font-bold bg-rose-500/10 p-2 rounded border border-rose-500/20">{globalError}</p>
                      )}

                      <button
                        onClick={handleConfirmBoletoPayment}
                        disabled={isConfirmingPayment}
                        className="w-full bg-emerald-650 hover:bg-emerald-550 disabled:bg-emerald-655/50 text-white py-3.5 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                      >
                        {isConfirmingPayment ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Processando confirmação do boleto...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard size={13} />
                            <span>Simular Pagamento do Boleto</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* RENDER FORMA DE PAGAMENTO: PIX */}
              {paymentMethod === 'pix' && !boletoResult && (
                <div className="space-y-4 pt-2 animate-scale-in">
                  {!checkoutResult ? (
                    <button
                      onClick={handleCheckout}
                      disabled={isProcessingCheckout || !selectedPlan}
                      className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white py-3.5 rounded-2xl font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isProcessingCheckout ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Processando Pix...</span>
                        </>
                      ) : (
                        <>
                          <span>Pagar com Pix</span>
                          <ArrowRight size={13} />
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-4 animate-scale-in">
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
                        <p className="text-[10px] text-rose-550 font-bold bg-rose-500/10 p-2 rounded border border-rose-500/20">{globalError}</p>
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
                            <span>Confirmar Pagamento Pix</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-800/60 flex items-start gap-2">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-[9.5px] text-slate-500 leading-relaxed font-medium">
              A renovação e cálculo do acesso comercial do HBFlow via Pix, Cartão ou Boleto é instantânea e 100% segura.
            </p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full z-10 text-center text-slate-600 text-[10px] pt-6 border-t border-slate-800 mt-8 flex justify-between items-center">
        <span>© 2026 HBFlow. Todos os direitos reservados.</span>
        <span className="flex items-center gap-1">Suporte Comercial <HelpCircle size={10} /></span>
      </footer>

      {/* Premium Animated Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden text-center flex flex-col items-center gap-6 animate-scale-in">
            {/* Radial glow effect */}
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
            
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center animate-bounce shadow-lg relative z-10 shrink-0">
              <Sparkles size={32} />
            </div>

            <div className="space-y-2 relative z-10">
              <h3 className="text-xl font-black text-white">Assinatura Ativada! 🚀</h3>
              <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest">
                Você agora é {activatedPlanName}!
              </p>
              <p className="text-xs text-slate-400 leading-relaxed font-medium pt-2">
                Parabéns! Sua transação foi processada e confirmada. O plano do seu tenant foi alterado com sucesso. Todos os recursos adicionais, canais extras e agentes inteligentes já estão totalmente liberados para você usar!
              </p>
            </div>

            <button
              onClick={() => {
                setShowSuccessModal(false);
                router.push('/dashboard');
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3.5 rounded-2xl font-black text-xs transition-all shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 cursor-pointer relative z-10"
            >
              Acessar o Painel de Controle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
