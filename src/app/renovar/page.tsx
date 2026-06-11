'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { CreditCard, Calendar, ShieldCheck, ArrowRight, AlertTriangle } from 'lucide-react';

export default function RenovarPage() {
  const router = useRouter();
  const { currentTenantId, tenants } = useStore();
  const [subInfo, setSubInfo] = useState<any>(null);
  const [access, setAccess] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/v1/billing/subscription');
        if (res.ok) {
          const data = await res.json();
          setSubInfo(data.subscription);
          setAccess(data.access);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, []);

  const currentTenant = tenants.find(t => t.id === currentTenantId) || tenants[0] || { name: 'Empresa' };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-900 px-4 py-8 relative overflow-hidden always-dark text-slate-100 font-sans">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />

      <div className="max-w-md w-full bg-slate-950/80 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <img src="/logo hbflow.png" alt="HBFlow Logo" className="h-10 object-contain mb-2" />
          <h2 className="text-xl font-bold tracking-tight text-white">Status da Assinatura</h2>
          <p className="text-xs text-slate-400 font-medium">{currentTenant.name}</p>
        </div>

        {access && !access.hasAccess && (
          <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-4 flex gap-3 items-start">
            <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-300 font-medium leading-relaxed">
              Assinatura vencida ou suspensa. Efetue a renovação para continuar acessando os recursos comerciais do HBFlow.
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Plano Atual</span>
            <span className="font-bold text-white uppercase tracking-wider">{subInfo?.plan?.name || 'Carregando...'}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Status</span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px] border ${
              access?.hasAccess 
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-950/20 border-rose-500/30 text-rose-450'
            }`}>
              {subInfo?.status || 'Carregando...'}
            </span>
          </div>
          {subInfo?.currentPeriodEnd && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Vencimento</span>
              <span className="font-mono text-slate-300 flex items-center gap-1.5">
                <Calendar size={12} className="text-slate-500" />
                {new Date(subInfo.currentPeriodEnd).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.push('/billing')}
            className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-2xl font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Ir para Faturamento</span>
            <ArrowRight size={13} />
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 py-3.5 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Voltar ao Dashboard</span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 pt-2 border-t border-slate-900">
          <ShieldCheck size={12} className="text-emerald-500" />
          <span>Renovação segura via PIX Instantâneo</span>
        </div>
      </div>
    </div>
  );
}
