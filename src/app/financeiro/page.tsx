'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import {
  CreditCard,
  Building,
  ShieldCheck,
  AlertTriangle,
  Clock,
  QrCode,
  Copy,
  Check,
  Loader2,
  Sparkles,
  ArrowRight,
  History,
  Calendar,
  DollarSign,
  UserCheck,
  ArrowUpRight
} from 'lucide-react';

export default function FinanceiroPage() {
  const router = useRouter();
  const {
    tenants,
    currentTenantId,
    invoices,
    fetchInvoices,
    isBlocked,
    subscriptionStatus,
    fetchUsers,
    triggerConfidencePayment
  } = useStore();

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'paid'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [pixCharge, setPixCharge] = useState<any>(null);
  const [loadingPix, setLoadingPix] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [copingPix, setCopingPix] = useState(false);
  const [confidenceLoading, setConfidenceLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Expiration info
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [accessInfo, setAccessInfo] = useState<any>(null);

  const activeTenant = tenants.find((t) => t.id === currentTenantId) || tenants[0] || { id: '', name: 'Empresa', slug: '', plan: 'starter' };

  const loadBillingData = async () => {
    try {
      await fetchInvoices();
      const subRes = await fetch('/api/v1/billing/subscription');
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscriptionInfo(subData.subscription);
        setAccessInfo(subData.access);
      }
    } catch (err) {
      console.error('Failed to load financeiro data:', err);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, [currentTenantId]);

  // Filter Invoices
  const filteredInvoices = invoices.filter((inv) => {
    if (activeTab === 'paid') return inv.status === 'paid';
    if (activeTab === 'pending') return inv.status === 'open' || inv.status === 'overdue';
    return true;
  });

  // Handle Pix Checkout Activation
  const handleSelectInvoice = async (invoice: any) => {
    if (invoice.status === 'paid') return;
    setSelectedInvoice(invoice);
    setPixCharge(null);
    setLoadingPix(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch(`/api/v1/billing/invoices/${invoice.id}/pix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPixCharge(data.pixCharge);
      } else {
        setFeedbackMsg({ type: 'error', text: data.error || 'Erro ao gerar QR Code Pix.' });
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Falha de conexão ao gerar o Pix.' });
    } finally {
      setLoadingPix(false);
    }
  };

  // Confirm Simulated Payment
  const handleConfirmPayment = async () => {
    if (!pixCharge || !selectedInvoice) return;
    setConfirmingPayment(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch(`/api/v1/admin/billing/payments/${pixCharge.paymentId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents: pixCharge.amountCents })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackMsg({ type: 'success', text: 'Pagamento simulado com sucesso!' });
        setSelectedInvoice(null);
        setPixCharge(null);
        await loadBillingData();
        await fetchUsers(); // Refresh blockage state
      } else {
        setFeedbackMsg({ type: 'error', text: data.error || 'Erro ao confirmar pagamento.' });
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Erro ao conectar ao servidor.' });
    } finally {
      setConfirmingPayment(false);
    }
  };

  // Trigger Confidence Payment
  const handleConfidencePayment = async () => {
    setConfidenceLoading(true);
    setFeedbackMsg(null);

    try {
      const res = await triggerConfidencePayment();
      if (res.success) {
        setFeedbackMsg({ type: 'success', text: res.message || 'Acesso liberado por 72 horas!' });
        await loadBillingData();
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Erro ao reativar por confiança.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erro de conexão ao servidor.' });
    } finally {
      setConfidenceLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (!pixCharge) return;
    navigator.clipboard.writeText(pixCharge.copyPasteCode);
    setCopingPix(true);
    setTimeout(() => setCopingPix(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard size={24} className="text-primary" />
            Painel Financeiro & Faturamento
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gerencie seu plano ativo, visualize faturas pendentes/pagas e realize renovações via Pix.
          </p>
        </div>
        
        <button
          onClick={() => router.push('/billing')}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/10 hover:scale-[1.02] cursor-pointer"
        >
          <span>Mudar de Plano</span>
          <ArrowUpRight size={14} />
        </button>
      </div>

      {/* Expiration warning & Confidence payment block */}
      {isBlocked && (
        <div className="bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/30 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-200/40 shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-rose-800 dark:text-rose-450 uppercase tracking-wider">Acesso Suspenso por Inadimplência</h4>
              <p className="text-xs text-rose-700 dark:text-rose-400 font-medium leading-relaxed max-w-xl">
                Seu plano comercial está vencido e o acesso aos recursos do painel foi temporariamente bloqueado. Realize o pagamento via Pix ou ative a liberação temporária por confiança de 3 dias para continuar trabalhando.
              </p>
            </div>
          </div>

          <button
            onClick={handleConfidencePayment}
            disabled={confidenceLoading}
            className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-400 text-white font-bold text-xs px-5 py-3 rounded-2xl transition-all shrink-0 cursor-pointer shadow-lg shadow-rose-600/10 active:scale-95"
          >
            {confidenceLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Liberar por Confiança (72h)</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Grace period display */}
      {!isBlocked && subscriptionStatus === 'confidence_grace' && accessInfo?.currentPeriodEnd && (
        <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30 rounded-3xl p-5 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
            <Clock size={20} className="animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">Acesso Temporário por Confiança Ativo</h4>
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-normal">
              Seu acesso está liberado sob promessa de pagamento até: <strong className="font-mono">{new Date(accessInfo.currentPeriodEnd).toLocaleDateString('pt-BR')}</strong> às <strong className="font-mono">{new Date(accessInfo.currentPeriodEnd).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>. Regularize sua mensalidade pendente para evitar novo bloqueio.
            </p>
          </div>
        </div>
      )}

      {/* Grid: Plan Details & Invoices List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Active Plan dossier card */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Building size={14} className="text-primary" />
            Dados da Assinatura
          </h3>

          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block mb-1">Plano Ativo</span>
              <div className="flex items-center gap-2">
                <strong className="text-slate-800 dark:text-white text-base capitalize">{subscriptionInfo?.plan?.name || activeTenant.plan}</strong>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                  subscriptionStatus === 'active' || subscriptionStatus === 'free'
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
                    : subscriptionStatus === 'confidence_grace'
                    ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30'
                    : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'
                }`}>
                  {subscriptionStatus === 'confidence_grace' ? 'Sob Confiança' : subscriptionStatus}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold block mb-1">Valor do Plano</span>
              <strong className="text-slate-800 dark:text-white text-lg font-mono">
                R$ {subscriptionInfo?.plan?.priceCents ? (subscriptionInfo.plan.priceCents / 100).toFixed(2) : '0.00'}
              </strong>
              <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">/mês</span>
            </div>

            {subscriptionInfo?.currentPeriodEnd && (
              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-1">Vencimento da Mensalidade</span>
                <span className="text-slate-700 dark:text-slate-350 text-xs font-semibold flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  {new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-bold block mb-2">Recursos Inclusos</span>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                <li className="flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
                  <span>Isolamento Multi-Tenant</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
                  <span>Atendimento Integrado Evolution API</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
                  <span>Suporte a Agentes Inteligentes</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right list & Checkout Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Feedback messages */}
          {feedbackMsg && (
            <div className={`p-4 rounded-2xl border text-xs font-bold flex gap-2 items-center ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400'
                : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-450'
            }`}>
              {feedbackMsg.type === 'success' ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Invoices List Tab & Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <History size={14} className="text-primary" />
                Histórico de Faturas
              </h3>

              {/* Tabs */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/40 dark:border-slate-700/30">
                {(['all', 'pending', 'paid'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setSelectedInvoice(null);
                      setPixCharge(null);
                    }}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      activeTab === tab
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    {tab === 'all' ? 'Todas' : tab === 'pending' ? 'Pendentes' : 'Pagas'}
                  </button>
                ))}
              </div>
            </div>

            {/* Invoices list */}
            {filteredInvoices.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                Nenhuma fatura encontrada neste filtro.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-medium">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800/60 pb-2">
                      <th className="py-2.5 font-bold">Fatura</th>
                      <th className="py-2.5 font-bold">Período</th>
                      <th className="py-2.5 font-bold">Vencimento</th>
                      <th className="py-2.5 font-bold">Valor</th>
                      <th className="py-2.5 font-bold">Status</th>
                      <th className="py-2.5 text-right font-bold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {filteredInvoices.map((inv) => (
                      <tr 
                        key={inv.id} 
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all ${
                          selectedInvoice?.id === inv.id ? 'bg-primary/5 dark:bg-primary/10' : ''
                        }`}
                      >
                        <td className="py-3 font-mono font-bold text-slate-700 dark:text-slate-350">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 text-[11px] text-slate-500">
                          {new Date(inv.billingPeriodStart).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-400 font-semibold">
                          {new Date(inv.dueDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 font-bold text-slate-800 dark:text-white font-mono">
                          R$ {(inv.totalCents / 100).toFixed(2)}
                        </td>
                        <td className="py-3">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                            inv.status === 'paid'
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400'
                              : inv.status === 'overdue'
                              ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400'
                              : 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400'
                          }`}>
                            {inv.status === 'paid' ? 'Paga' : inv.status === 'overdue' ? 'Vencida' : 'Aberta'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {inv.status !== 'paid' ? (
                            <button
                              onClick={() => handleSelectInvoice(inv)}
                              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white dark:hover:bg-primary text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-lg border border-slate-200/60 dark:border-slate-700/60 transition-all cursor-pointer"
                            >
                              Pagar Fatura
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Paga</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pix Checkout Drawer / Card */}
          {selectedInvoice && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white space-y-6 animate-scale-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Checkout Pix</h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Fatura: {selectedInvoice.invoiceNumber}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedInvoice(null);
                    setPixCharge(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer bg-slate-800 border border-slate-700/40 px-2.5 py-1 rounded-lg"
                >
                  Fechar
                </button>
              </div>

              {loadingPix ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 size={24} className="animate-spin text-primary" />
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Gerando Pix...</span>
                </div>
              ) : pixCharge ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  
                  {/* Pix QR Code display */}
                  <div className="flex flex-col items-center justify-center bg-slate-950 border border-slate-800/80 p-5 rounded-2xl gap-3">
                    <div className="bg-white p-3 rounded-xl w-36 h-36 flex items-center justify-center">
                      <QrCode size={120} className="text-slate-950" />
                    </div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                      QR Code Pix Simulado
                    </span>
                  </div>

                  {/* Pix copy and simulated checkout button */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor a pagar</span>
                      <strong className="text-xl font-mono text-primary">R$ {(pixCharge.amountCents / 100).toFixed(2)}</strong>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Chave Pix Copia e Cola
                      </label>
                      <div className="flex bg-slate-950 border border-slate-800/80 rounded-xl px-3 py-2 items-center">
                        <input
                          type="text"
                          readOnly
                          value={pixCharge.copyPasteCode}
                          className="bg-transparent border-none text-[10px] text-slate-400 select-all font-mono outline-none flex-1 truncate"
                        />
                        <button
                          onClick={handleCopyPix}
                          className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          {copingPix ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleConfirmPayment}
                      disabled={confirmingPayment}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white font-bold text-xs py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {confirmingPayment ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Processando Confirmação...</span>
                        </>
                      ) : (
                        <>
                          <DollarSign size={14} />
                          <span>Simular Pagamento Pix</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
