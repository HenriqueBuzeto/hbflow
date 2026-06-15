'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  X, 
  TrendingUp, 
  Building2, 
  Users, 
  Zap, 
  Tag, 
  MessageSquare, 
  PhoneCall 
} from 'lucide-react';

interface OnboardingSteps {
  profileCompleted: boolean;
  usersAdded: boolean;
  connectionEstablished: boolean;
  tagsCreated: boolean;
  quickRepliesCreated: boolean;
  messageSent: boolean;
}

export default function OnboardingChecklist() {
  const [steps, setSteps] = useState<OnboardingSteps | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch onboarding status on mount
  useEffect(() => {
    const fetchOnboardingStatus = async () => {
      try {
        const res = await fetch('/api/v1/onboarding/status');
        const data = await res.json();
        if (data.success) {
          setSteps(data.steps);
          setDismissed(data.onboardingDismissed);
        }
      } catch (err) {
        console.error('Error fetching onboarding status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOnboardingStatus();
  }, []);

  const handleDismiss = async () => {
    try {
      setDismissed(true);
      await fetch('/api/v1/onboarding/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissed: true })
      });
    } catch (err) {
      console.error('Error dismissing onboarding checklist:', err);
    }
  };

  if (loading || dismissed || !steps) return null;

  // Calculate completed count and percentage
  const stepItems = [
    {
      key: 'profileCompleted',
      label: 'Preencher Perfil da Empresa',
      desc: 'Complete os dados do Tenant com CNPJ, email e telefone.',
      href: '/configuracoes',
      icon: Building2,
      completed: steps.profileCompleted
    },
    {
      key: 'usersAdded',
      label: 'Cadastrar Atendente Secundário',
      desc: 'Adicione pelo menos um operador extra na sua equipe.',
      href: '/usuarios',
      icon: Users,
      completed: steps.usersAdded
    },
    {
      key: 'connectionEstablished',
      label: 'Conectar Canal WhatsApp',
      desc: 'Realize o pareamento via QR Code (Evolution API) ou Cloud API.',
      href: '/conexao',
      icon: PhoneCall,
      completed: steps.connectionEstablished
    },
    {
      key: 'tagsCreated',
      label: 'Criar Primeira Tag de Lead',
      desc: 'Crie e aplique uma etiqueta térmica em qualquer contato.',
      href: '/tags',
      icon: Tag,
      completed: steps.tagsCreated
    },
    {
      key: 'quickRepliesCreated',
      label: 'Configurar Resposta Rápida',
      desc: 'Cadastre atalhos práticos para mensagens automáticas na Inbox.',
      href: '/setores',
      icon: Zap,
      completed: steps.quickRepliesCreated
    },
    {
      key: 'messageSent',
      label: 'Enviar Primeira Mensagem Ativa',
      desc: 'Dispare uma conversa inicial a partir da sua caixa de entrada.',
      href: '/inbox',
      icon: MessageSquare,
      completed: steps.messageSent
    }
  ];

  const completedCount = stepItems.filter(item => item.completed).length;
  const progressPercent = Math.round((completedCount / stepItems.length) * 100);

  // If all steps are complete, we can automatically hide the dashboard or show a success state
  const allCompleted = completedCount === stepItems.length;

  return (
    <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6 relative overflow-hidden transition-all duration-300">
      
      {/* Decorative colored glow on top edge */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-indigo-500 to-emerald-500" />

      {/* Header section with dismiss button */}
      <div className="flex justify-between items-start gap-4 mb-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            Guia de Configuração Inicial (Onboarding)
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Siga os passos abaixo para desbloquear o potencial completo da sua plataforma de atendimento automatizado HBFlow.
          </p>
        </div>
        <button 
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100 cursor-pointer"
          title="Dispensar onboarding"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress indicators */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-slate-100/60 border border-slate-200/50 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm shrink-0">
            {completedCount}/{stepItems.length}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              {allCompleted ? '🎉 Tudo Pronto!' : 'Seu Progresso'}
            </span>
            <span className="text-[10px] text-slate-500 block font-medium">
              {allCompleted 
                ? 'Você completou todas as tarefas iniciais de onboarding!' 
                : `${stepItems.length - completedCount} etapas restantes para ativação comercial completa.`}
            </span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="flex-1 max-w-xs sm:ml-4">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 mb-1">
            <span>Conclusão</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stepItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div 
              key={item.key} 
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                item.completed 
                  ? 'bg-emerald-50/10 border-emerald-100 hover:bg-emerald-50/20' 
                  : 'bg-white border-slate-250/70 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${
                  item.completed 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  <Icon size={16} />
                </div>
                <div className="space-y-0.5">
                  <span className={`text-xs font-bold block ${
                    item.completed ? 'text-slate-800 line-through decoration-slate-400' : 'text-slate-800'
                  }`}>
                    {index + 1}. {item.label}
                  </span>
                  <p className="text-[10px] text-slate-500 leading-normal font-medium">
                    {item.desc}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100/60 pt-2.5 mt-1">
                <div className="flex items-center gap-1.5">
                  {item.completed ? (
                    <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-100/50 border border-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={10} />
                      Concluído
                    </span>
                  ) : (
                    <span className="text-[9px] font-extrabold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Circle size={10} />
                      Pendente
                    </span>
                  )}
                </div>

                {!item.completed && (
                  <Link 
                    href={item.href}
                    className="text-[10px] font-bold text-primary hover:text-primary-hover flex items-center gap-0.5 transition-colors cursor-pointer group"
                  >
                    <span>Configurar</span>
                    <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
