'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  CheckCircle2, 
  Loader2, 
  Home, 
  CreditCard, 
  Sparkles, 
  AlertTriangle 
} from 'lucide-react';

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const receiptUrl = searchParams.get('receipt_url');
  const orderNsu = searchParams.get('order_nsu'); // invoiceId
  const slug = searchParams.get('slug'); // invoice_slug
  const captureMethod = searchParams.get('capture_method');
  const transactionNsu = searchParams.get('transaction_nsu');

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Fetch the invoice and payment info using orderNsu (invoiceId)
  const fetchInvoiceStatus = async () => {
    if (!orderNsu) {
      setErrorMsg('Identificador da fatura (order_nsu) não encontrado na URL.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/v1/billing/invoices/${orderNsu}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setInvoice(data.invoice);
        // Encontra o pagamento mais recente da InfinitePay
        const ipPayment = data.invoice.payments?.find(
          (p: any) => p.provider === 'infinitepay'
        ) || data.invoice.payments?.[0];
        setPayment(ipPayment);
      } else {
        setErrorMsg(data.error || 'Erro ao consultar status da fatura.');
      }
    } catch (err) {
      setErrorMsg('Falha ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceStatus();
  }, [orderNsu]);

  // 2. Trigger active payment check to sync status
  const handleCheckPayment = async () => {
    if (!payment) {
      setErrorMsg('Nenhum pagamento correspondente localizado para verificação.');
      return;
    }

    setChecking(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/v1/billing/payments/${payment.id}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        if (data.paid) {
          setSuccessMsg('Pagamento confirmado com sucesso! Seu plano foi ativado.');
          // Atualiza dados na tela
          await fetchInvoiceStatus();
        } else {
          setErrorMsg('O pagamento ainda consta como pendente na InfinitePay. Se você acabou de pagar, aguarde alguns instantes e tente novamente.');
        }
      } else {
        setErrorMsg(data.error || 'Erro ao verificar pagamento.');
      }
    } catch (err) {
      setErrorMsg('Erro de conexão ao verificar pagamento.');
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="animate-spin text-primary" />
        <p className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Processando Retorno...</p>
      </div>
    );
  }

  const isPaid = invoice?.status === 'paid' || payment?.status === 'paid';

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl space-y-6 text-center animate-scale-in relative z-10">
        
        {/* Animated Badge Header */}
        {isPaid ? (
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg animate-bounce">
            <CheckCircle2 size={36} />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-lg animate-pulse">
            <Loader2 size={36} className="animate-spin" />
          </div>
        )}

        {/* Heading */}
        <div className="space-y-1">
          <h2 className="text-xl font-black">
            {isPaid ? 'Pagamento Aprovado!' : 'Pagamento em Processamento'}
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            {isPaid 
              ? 'Sua fatura foi quitada e seu plano comercial está ativo.' 
              : 'Estamos aguardando a confirmação do pagamento pelo banco.'}
          </p>
        </div>

        {/* Transaction Summary Dossier */}
        <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 text-left text-xs space-y-2.5">
          <div className="flex justify-between border-b border-slate-900 pb-1.5">
            <span className="text-slate-500 font-medium">Número da Fatura:</span>
            <strong className="font-mono text-white">{invoice?.invoiceNumber || 'N/A'}</strong>
          </div>
          <div className="flex justify-between border-b border-slate-900 pb-1.5">
            <span className="text-slate-500 font-medium">Plano:</span>
            <strong className="text-white capitalize">{invoice?.subscription?.plan?.name || 'Starter'}</strong>
          </div>
          <div className="flex justify-between border-b border-slate-900 pb-1.5">
            <span className="text-slate-500 font-medium">Valor Total:</span>
            <strong className="text-white font-mono">
              R$ {invoice ? (invoice.totalCents / 100).toFixed(2) : '0.00'}
            </strong>
          </div>
          {captureMethod && (
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span className="text-slate-500 font-medium">Método de Captura:</span>
              <span className="text-white capitalize font-semibold">{captureMethod}</span>
            </div>
          )}
          {transactionNsu && (
            <div className="flex justify-between pb-0.5">
              <span className="text-slate-500 font-medium">NSU Transação:</span>
              <span className="font-mono text-slate-300 text-[10px] truncate max-w-[150px]">{transactionNsu}</span>
            </div>
          )}
        </div>

        {/* Action feedback notifications */}
        {successMsg && (
          <p className="text-xs text-emerald-400 font-bold bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
            {successMsg}
          </p>
        )}
        {errorMsg && (
          <p className="text-xs text-amber-400 font-bold bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20 flex gap-1.5 items-start text-left leading-relaxed">
            <AlertTriangle size={16} className="shrink-0 text-amber-500" />
            <span>{errorMsg}</span>
          </p>
        )}

        {/* Buttons Action bar */}
        <div className="flex flex-col gap-2.5 pt-2">
          {!isPaid && (
            <button
              onClick={handleCheckPayment}
              disabled={checking}
              className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-bold text-xs py-3.5 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer shadow-primary/10"
            >
              {checking ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Verificando com InfinitePay...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Verificar Pagamento</span>
                </>
              )}
            </button>
          )}

          {receiptUrl && (
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 border border-slate-700/40"
            >
              <CreditCard size={14} />
              <span>Ver Comprovante Real</span>
            </a>
          )}

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-slate-950 hover:bg-slate-900 text-slate-300 font-bold text-xs py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 border border-slate-850 cursor-pointer"
          >
            <Home size={14} />
            <span>Voltar ao Sistema</span>
          </button>
        </div>

      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="animate-spin text-primary" />
        <p className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Carregando...</p>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  );
}
