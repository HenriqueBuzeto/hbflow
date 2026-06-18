'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight } from 'lucide-react';

interface TrialBannerProps {
  daysRemaining: number;
  status: string;
}

export default function TrialBanner({ daysRemaining, status }: TrialBannerProps) {
  const router = useRouter();

  if (status !== 'trialing' || daysRemaining === undefined) {
    return null;
  }

  let text = '';
  if (daysRemaining > 1) {
    text = `Seu teste grátis termina em ${daysRemaining} dias. Assine agora para não perder acesso.`;
  } else if (daysRemaining === 1) {
    text = 'Seu teste grátis termina amanhã. Assine agora para não perder acesso.';
  } else {
    text = 'Seu teste grátis termina hoje. Assine agora para não perder acesso.';
  }

  return (
    <div className="bg-gradient-to-r from-primary via-indigo-600 to-violet-700 text-white text-[11px] font-bold py-2 px-4 flex items-center justify-between shadow-md relative z-40 select-none">
      <div className="flex items-center gap-2 mx-auto sm:mx-0">
        <span className="bg-white/20 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse border border-white/10">
          <Sparkles size={8} /> Teste Ativo
        </span>
        <span className="leading-none text-slate-100">{text}</span>
      </div>
      <button
        onClick={() => router.push('/billing')}
        className="hidden sm:flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-[9px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
      >
        <span>Assinar Plano</span>
        <ArrowRight size={10} />
      </button>
    </div>
  );
}
