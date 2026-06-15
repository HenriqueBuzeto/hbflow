'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import {
  Megaphone,
  Zap,
  Award,
  Phone,
  Trash2,
  Edit3,
  Plus,
  X,
  Route,
  Users,
  CheckCircle,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Layers,
  Bot,
  Play,
  RefreshCw,
  Sliders,
  Search,
  Copy,
  Clock,
  Check
} from 'lucide-react';
import Link from 'next/link';

interface Step {
  id?: string;
  name: string;
  delayValue: number;
  delayUnit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
  message: string;
  channel: string;
  isActive: boolean;
  order: number;
}

interface Journey {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  triggerConfig: string | null;
  isActive: boolean;
  steps: Step[];
}

interface ScheduledMessage {
  id: string;
  content: string;
  scheduledAt: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sentAt?: string | null;
  failedAt?: string | null;
  errorMessage?: string | null;
  contact?: { name: string; phone: string };
  journey?: { name: string };
  step?: { name: string };
}

export default function CustomerJourneyPage() {
  const { userPlan } = useStore();
  const plan = (userPlan ? userPlan.toLowerCase() : 'starter') as 'starter' | 'pro' | 'enterprise';

  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Tabs: 'journeys' | 'scheduled' | 'dashboard'
  const [activeSubTab, setActiveSubTab] = useState<'journeys' | 'scheduled' | 'dashboard'>('journeys');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTrigger, setFormTrigger] = useState('tag_added');
  const [formTriggerTag, setFormTriggerTag] = useState('pos-venda');
  const [formSteps, setFormSteps] = useState<Step[]>([
    { name: 'Agradecimento', delayValue: 1, delayUnit: 'days', message: 'Olá {primeiroNome}, obrigado pela sua compra de {produto}! Como foi a sua experiência?', channel: 'whatsapp', isActive: true, order: 0 }
  ]);

  // Load Initial Data
  const loadData = async () => {
    if (plan === 'starter') return;
    setLoading(true);
    try {
      const resJourneys = await fetch('/api/v1/after-sales/journeys');
      if (resJourneys.ok) {
        const data = await resJourneys.json();
        setJourneys(data);
      }

      const resScheduled = await fetch('/api/v1/after-sales/scheduled');
      if (resScheduled.ok) {
        const data = await resScheduled.json();
        setScheduled(data);
      }
    } catch (err) {
      console.error('Error loading journeys data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [plan]);

  // Handle Form Submit
  const handleSaveJourney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    // Valida limite de múltiplas jornadas para Plano Pro
    if (plan === 'pro' && journeys.length >= 3 && !editingJourney) {
      setError('O Plano PRO permite no máximo 3 jornadas ativas simultaneamente. Faça upgrade para o Enterprise para jornadas ilimitadas.');
      setSubmitting(false);
      return;
    }

    const triggerConfig = formTrigger === 'tag_added' ? { tagName: formTriggerTag } : null;

    try {
      const payload = {
        name: formName,
        description: formFormulateDescription(),
        trigger: formTrigger,
        triggerConfig,
        steps: formSteps.map((s, idx) => ({ ...s, order: idx }))
      };

      let res;
      if (editingJourney) {
        res = await fetch(`/api/v1/after-sales/journeys/${editingJourney.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/v1/after-sales/journeys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar jornada.');

      setSuccess(editingJourney ? 'Jornada atualizada!' : 'Jornada criada com sucesso!');
      await loadData();
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess('');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Falha de comunicação.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper description generator
  const formFormulateDescription = () => {
    if (formDesc) return formDesc;
    if (formTrigger === 'tag_added') return `Disparado ao adicionar a tag "${formTriggerTag}"`;
    if (formTrigger === 'deal_won') return 'Disparado ao marcar negócio como Ganho';
    if (formTrigger === 'conversation_closed') return 'Disparado ao fechar chat de atendimento';
    return 'Gatilho customizado';
  };

  // Setup modals
  const openCreateModal = () => {
    setEditingJourney(null);
    setFormName('');
    setFormDesc('');
    setFormTrigger('tag_added');
    setFormTriggerTag('pos-venda');
    setFormSteps([
      { name: 'Agradecimento', delayValue: 1, delayUnit: 'days', message: 'Olá {primeiroNome}, obrigado pela sua compra de {produto}! Como foi a sua experiência?', channel: 'whatsapp', isActive: true, order: 0 }
    ]);
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const openEditModal = (j: Journey) => {
    setEditingJourney(j);
    setFormName(j.name);
    setFormDesc(j.description || '');
    setFormTrigger(j.trigger);
    
    let tag = 'pos-venda';
    if (j.triggerConfig) {
      try {
        const conf = JSON.parse(j.triggerConfig);
        tag = conf.tagName || conf.tagId || 'pos-venda';
      } catch (e) {}
    }
    setFormTriggerTag(tag);
    setFormSteps(j.steps || []);
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  // Delete Journey
  const handleDelete = async (journeyId: string) => {
    if (!confirm('Deseja realmente excluir esta jornada? Todos os agendamentos pendentes associados serão cancelados.')) return;
    try {
      const res = await fetch(`/api/v1/after-sales/journeys/${journeyId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao deletar.');
      }
      setSuccess('Jornada excluída com sucesso!');
      await loadData();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Erro de comunicação.');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Duplicate Journey
  const handleDuplicate = async (journeyId: string) => {
    try {
      const res = await fetch(`/api/v1/after-sales/journeys/${journeyId}`, { method: 'POST' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao duplicar.');
      }
      setSuccess('Jornada duplicada com sucesso (Cópia criada como inativa).');
      await loadData();
      setTimeout(() => setSuccess(''), 2500);
    } catch (err: any) {
      setError(err.message || 'Erro de comunicação.');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Toggle quick active status
  const handleToggleActive = async (j: Journey) => {
    try {
      const res = await fetch(`/api/v1/after-sales/journeys/${j.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !j.isActive })
      });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Manual trigger / cancel scheduled message
  const handleScheduledMessageAction = async (msgId: string, action: 'cancel' | 'fire_now') => {
    try {
      const res = await fetch('/api/v1/after-sales/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, messageId: msgId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar ação.');

      setSuccess(action === 'cancel' ? 'Agendamento cancelado com sucesso!' : 'Mensagem enviada com sucesso!');
      await loadData();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao executar ação.');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Segment template pre-configurations
  const importSegmentTemplate = (segment: string) => {
    setError('');
    if (segment === 'optical') {
      setFormName('Revisão e Adaptação - Óticas');
      setFormTrigger('tag_added');
      setFormTriggerTag('revisao-oculos');
      setFormSteps([
        { name: 'Período de Adaptação', delayValue: 7, delayUnit: 'days', message: 'Olá {primeiroNome}! Faz uma semana que você pegou seus óculos. Conseguiu se adaptar bem às lentes? Conta pra gente!', channel: 'whatsapp', isActive: true, order: 0 },
        { name: 'Ajuste e Limpeza', delayValue: 30, delayUnit: 'days', message: 'Olá {nome}, tudo bem? Passando para te lembrar que você tem direito a um ajuste gratuito de plaquetas e higienização ultrassônica aqui na loja. Que tal agendar?', channel: 'whatsapp', isActive: true, order: 1 },
        { name: 'Revisão Anual', delayValue: 360, delayUnit: 'days', message: 'Olá {primeiroNome}, sua receita de óculos completou 1 ano hoje. É importante visitar seu oftalmologista para ver se seu grau continua o mesmo. Deseja agendar sua revisão?', channel: 'whatsapp', isActive: true, order: 2 }
      ]);
    } else if (segment === 'clothing') {
      setFormName('Jornada de Satisfação e Retorno - Lojas de Varejo');
      setFormTrigger('deal_won');
      setFormSteps([
        { name: 'Satisfação Pós-Compra', delayValue: 3, delayUnit: 'days', message: 'Oi {primeiroNome}! O que achou das suas novas peças de {produto}? Se precisar de qualquer ajuste ou troca, estamos à disposição!', channel: 'whatsapp', isActive: true, order: 0 },
        { name: 'Novidades Exclusivas', delayValue: 45, delayUnit: 'days', message: 'Olá {primeiroNome}! Chegaram novidades na loja da nossa nova coleção. Como você comprou {produto} conosco recentemente, preparamos um cupom de 10% para sua próxima visita. Cupom: RETORNO10', channel: 'whatsapp', isActive: true, order: 1 }
      ]);
    } else if (segment === 'clinic') {
      setFormName('Acompanhamento Clínico / Médico');
      setFormTrigger('conversation_closed');
      setFormSteps([
        { name: 'Pós-Consulta', delayValue: 24, delayUnit: 'hours', message: 'Olá {primeiroNome}, aqui é da clínica. Como você está se sentindo após sua consulta/procedimento? Lembre-se de seguir as orientações médicas.', channel: 'whatsapp', isActive: true, order: 0 },
        { name: 'Retorno Preventivo', delayValue: 180, delayUnit: 'days', message: 'Olá {nome}, faz 6 meses desde seu último atendimento preventivo. Prevenir é o melhor cuidado. Vamos agendar seu exame de rotina?', channel: 'whatsapp', isActive: true, order: 1 }
      ]);
    } else if (segment === 'pet') {
      setFormName('Retorno Vacinas e Higiene - Pet Shop');
      setFormTrigger('tag_added');
      setFormTriggerTag('pet-banho');
      setFormSteps([
        { name: 'Satisfação Banho/Tosa', delayValue: 2, delayUnit: 'days', message: 'Olá {primeiroNome}! Como ficou o cheirinho do seu pet após o banho? Esperamos que tenha gostado!', channel: 'whatsapp', isActive: true, order: 0 },
        { name: 'Lembrete de Vacinas', delayValue: 90, delayUnit: 'days', message: 'Atenção {primeiroNome}! Passando para lembrar que está na época de atualizar as vacinas/anti-pulgas do seu pet. Vamos reservar um horário?', channel: 'whatsapp', isActive: true, order: 1 }
      ]);
    } else if (segment === 'autocenter') {
      setFormName('Manutenção Preventiva - Auto Center');
      setFormTrigger('tag_added');
      setFormTriggerTag('revisao-carro');
      setFormSteps([
        { name: 'Pós-Revisão', delayValue: 7, delayUnit: 'days', message: 'Olá {primeiroNome}! Tudo certo com o comportamento do seu carro após a revisão? Qualquer dúvida, nossa oficina está à disposição.', channel: 'whatsapp', isActive: true, order: 0 },
        { name: 'Troca de Óleo', delayValue: 180, delayUnit: 'days', message: 'Olá {nome}, faz 6 meses desde sua última troca de óleo/revisão. Andar com óleo vencido reduz a vida útil do motor. Vamos agendar sua preventiva?', channel: 'whatsapp', isActive: true, order: 1 }
      ]);
    }
  };

  // Add/Remove local form steps
  const addFormStep = () => {
    const nextIdx = formSteps.length;
    setFormSteps([
      ...formSteps,
      { name: `Etapa ${nextIdx + 1}`, delayValue: 7, delayUnit: 'days', message: 'Olá {primeiroNome}...', channel: 'whatsapp', isActive: true, order: nextIdx }
    ]);
  };

  const removeFormStep = (idx: number) => {
    setFormSteps(formSteps.filter((_, i) => i !== idx));
  };

  const updateFormStep = (idx: number, updates: Partial<Step>) => {
    setFormSteps(formSteps.map((s, i) => i === idx ? { ...s, ...updates } : s));
  };

  // Render Starter Block screen if applicable
  if (plan === 'starter') {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 shadow-sm text-center flex flex-col items-center justify-center gap-6 relative overflow-hidden min-h-[500px]">
        <div className="absolute top-[-50%] right-[-10%] w-[50%] h-[150%] bg-primary/5 rounded-full blur-[90px] pointer-events-none" />
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-sm shrink-0">
          <Sliders size={32} />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-xl font-bold text-slate-800 flex items-center justify-center gap-2">
            <Megaphone className="text-primary" size={22} />
            Customer Journey Automation
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            O recurso de <strong>Pós-Venda Inteligente</strong> permite criar fluxos contínuos de mensagens automatizadas no WhatsApp baseados no comportamento do cliente (tags, vendas ganhas, encerramento de chat).
          </p>
        </div>
        
        <div className="border border-amber-150 bg-amber-50/70 p-4.5 rounded-2xl max-w-sm text-left space-y-2.5 text-xs text-amber-850">
          <span className="font-bold block uppercase text-[10px] tracking-wider text-amber-900">RECURSO PREMIUM INDISPONÍVEL</span>
          <p className="leading-relaxed">
            Seu plano atual <strong>STARTER</strong> não possui acesso ao pós-venda automatizado. Faça o upgrade agora para o plano <strong>PRO</strong> ou <strong>ENTERPRISE</strong> para começar a automatizar sua esteira de vendas.
          </p>
        </div>

        <Link
          href="/billing"
          className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-primary/10 cursor-pointer"
        >
          Fazer Upgrade de Plano
        </Link>
      </div>
    );
  }

  // Dashboard calculation data
  const activeCount = journeys.filter(j => j.isActive).length;
  const pendingCount = scheduled.filter(s => s.status === 'pending').length;
  const sentCount = scheduled.filter(s => s.status === 'sent').length;
  const failedCount = scheduled.filter(s => s.status === 'failed').length;
  const responseRate = sentCount > 0 ? Math.round((sentCount / (sentCount + failedCount)) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Header and Limits warning */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="absolute top-[-50%] right-[-10%] w-[35%] h-[150%] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Route size={24} className="text-primary animate-pulse" />
            Customer Journey Automation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure jornadas inteligentes multicanal pós-venda para reter clientes, colher feedbacks e disparar revisões de qualquer segmento.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 z-10">
          {plan === 'pro' && journeys.length >= 3 && (
            <div className="bg-amber-50 border border-amber-150 rounded-xl px-3 py-2 text-[10.5px] text-amber-800 font-medium max-w-[200px] leading-snug">
              Quota PRO: <strong className="font-bold">{journeys.length}/3 jornadas</strong>. Atualize para o Enterprise para ilimitado.
            </div>
          )}
          <button
            onClick={openCreateModal}
            className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-primary/10 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={16} />
            <span>Criar Jornada</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-bold text-slate-500">
        <button
          onClick={() => setActiveSubTab('journeys')}
          className={`pb-2.5 border-b-2 cursor-pointer transition-colors ${activeSubTab === 'journeys' ? 'border-primary text-slate-900' : 'border-transparent hover:text-slate-800'}`}
        >
          Minhas Jornadas ({journeys.length})
        </button>
        <button
          onClick={() => setActiveSubTab('scheduled')}
          className={`pb-2.5 border-b-2 cursor-pointer transition-colors ${activeSubTab === 'scheduled' ? 'border-primary text-slate-900' : 'border-transparent hover:text-slate-800'}`}
        >
          Fila de Agendamento ({scheduled.length})
        </button>
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`pb-2.5 border-b-2 cursor-pointer transition-colors ${activeSubTab === 'dashboard' ? 'border-primary text-slate-900' : 'border-transparent hover:text-slate-800'}`}
        >
          Dashboard e Métricas
        </button>
      </div>

      {/* TABS CONTAINER */}
      {loading ? (
        <div className="bg-white border p-12 rounded-3xl text-center text-slate-400">Carregando dados...</div>
      ) : (
        <>
          {activeSubTab === 'journeys' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Journeys List */}
              <div className="md:col-span-2 space-y-4">
                {journeys.length === 0 ? (
                  <div className="bg-white border p-12 rounded-3xl text-center text-slate-400">
                    Nenhuma jornada ativa criada ainda. Clique em "Criar Jornada" ou importe um template na lateral.
                  </div>
                ) : (
                  journeys.map((j) => (
                    <div key={j.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 hover:border-slate-350 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-850 text-sm flex items-center gap-2">
                            {j.name}
                            <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full uppercase ${j.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                              {j.isActive ? 'Ativa' : 'Pausa'}
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-450 leading-relaxed">{j.description}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleActive(j)}
                            className="bg-slate-50 hover:bg-slate-100 border p-1.5 rounded-lg text-slate-650 cursor-pointer"
                            title={j.isActive ? 'Pausar Jornada' : 'Ativar Jornada'}
                          >
                            <Play size={13} className={j.isActive ? 'text-amber-500' : 'text-emerald-500'} />
                          </button>
                          <button
                            onClick={() => handleDuplicate(j.id)}
                            className="bg-slate-50 hover:bg-slate-100 border p-1.5 rounded-lg text-slate-650 cursor-pointer"
                            title="Duplicar Jornada"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            onClick={() => openEditModal(j)}
                            className="bg-slate-50 hover:bg-slate-100 border p-1.5 rounded-lg text-slate-650 cursor-pointer"
                            title="Editar Jornada"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(j.id)}
                            className="bg-slate-50 hover:bg-rose-50 border p-1.5 rounded-lg text-rose-500 cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Display Steps info inline */}
                      <div className="border-t pt-3.5 space-y-3">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Fluxo de Etapas</span>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-750">
                          {j.steps.map((step, idx) => (
                            <React.Fragment key={step.id || idx}>
                              <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">{idx + 1}</span>
                                <div>
                                  <span className="block font-bold text-[11px] text-slate-800">{step.name}</span>
                                  <span className="block text-[9px] text-slate-400 font-mono mt-0.5">+{step.delayValue} {step.delayUnit}</span>
                                </div>
                              </div>
                              {idx < j.steps.length - 1 && <span className="text-slate-300">➜</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Templates Sidebar */}
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b pb-2">
                    <Zap size={14} className="text-primary animate-pulse" />
                    <span>Templates Rápidos por Segmento</span>
                  </h4>
                  <p className="text-[11.5px] text-slate-450 leading-relaxed">
                    Importe estruturas pré-configuradas e modifique as mensagens para se adequar ao seu negócio de forma ágil:
                  </p>
                  
                  <div className="space-y-2.5">
                    <button
                      onClick={() => { openCreateModal(); setTimeout(() => importSegmentTemplate('optical'), 100); }}
                      className="w-full text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 p-3 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer transition-all"
                    >
                      <span>👓 Óticas (Adaptação/Limpeza/Retorno)</span>
                      <Plus size={14} className="text-slate-400" />
                    </button>
                    <button
                      onClick={() => { openCreateModal(); setTimeout(() => importSegmentTemplate('clothing'), 100); }}
                      className="w-full text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 p-3 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer transition-all"
                    >
                      <span>👗 Lojas de Roupas (Satisfação/Retorno)</span>
                      <Plus size={14} className="text-slate-400" />
                    </button>
                    <button
                      onClick={() => { openCreateModal(); setTimeout(() => importSegmentTemplate('clinic'), 100); }}
                      className="w-full text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 p-3 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer transition-all"
                    >
                      <span>🩺 Clínicas e Consultórios (Procedimentos)</span>
                      <Plus size={14} className="text-slate-400" />
                    </button>
                    <button
                      onClick={() => { openCreateModal(); setTimeout(() => importSegmentTemplate('pet'), 100); }}
                      className="w-full text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 p-3 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer transition-all"
                    >
                      <span>🐾 Pet Shops (Banho/Tosa/Retorno)</span>
                      <Plus size={14} className="text-slate-400" />
                    </button>
                    <button
                      onClick={() => { openCreateModal(); setTimeout(() => importSegmentTemplate('autocenter'), 100); }}
                      className="w-full text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 p-3 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer transition-all"
                    >
                      <span>🚗 Auto Center (Óleo/Preventiva)</span>
                      <Plus size={14} className="text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scheduled Messages Fila */}
          {activeSubTab === 'scheduled' && (
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-4">Cliente / Contato</th>
                      <th className="px-6 py-4">Jornada / Etapa</th>
                      <th className="px-6 py-4 font-mono">Agendamento</th>
                      <th className="px-6 py-4">Mensagem Resolvida</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {scheduled.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                          Nenhuma mensagem agendada ou enviada na fila no momento.
                        </td>
                      </tr>
                    ) : (
                      scheduled.map((msg) => (
                        <tr key={msg.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <span className="font-bold text-slate-800 block">{msg.contact?.name || 'Cliente'}</span>
                              <span className="text-[10px] text-slate-450 block font-mono mt-0.5">{msg.contact?.phone}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <span className="text-slate-800 font-bold block">{msg.journey?.name || 'Agendamento manual'}</span>
                              <span className="text-[9.5px] text-primary font-bold uppercase block mt-0.5">{msg.step?.name || 'Outbound'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-600">
                            {new Date(msg.scheduledAt).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 max-w-[280px]">
                            <p className="truncate text-slate-500" title={msg.content}>{msg.content}</p>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                              msg.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              msg.status === 'sent' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              msg.status === 'cancelled' ? 'bg-slate-100 text-slate-500' : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${
                                msg.status === 'pending' ? 'bg-amber-500 animate-pulse' :
                                msg.status === 'sent' ? 'bg-emerald-500' :
                                msg.status === 'cancelled' ? 'bg-slate-400' : 'bg-rose-500'
                              }`} />
                              {msg.status === 'pending' ? 'Pendente' :
                               msg.status === 'sent' ? 'Enviado' :
                               msg.status === 'cancelled' ? 'Cancelado' : 'Falhou'}
                            </span>
                            {msg.status === 'failed' && msg.errorMessage && (
                              <span className="block text-[8px] text-rose-500 mt-1 truncate max-w-[100px] mx-auto" title={msg.errorMessage}>{msg.errorMessage}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2.5">
                              {msg.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleScheduledMessageAction(msg.id, 'fire_now')}
                                    className="text-emerald-600 hover:text-emerald-700 font-bold inline-flex items-center gap-0.5 cursor-pointer"
                                    title="Disparar Agora"
                                  >
                                    <Play size={11} />
                                    <span>Enviar</span>
                                  </button>
                                  <button
                                    onClick={() => handleScheduledMessageAction(msg.id, 'cancel')}
                                    className="text-rose-500 hover:text-rose-700 font-bold inline-flex items-center gap-0.5 cursor-pointer"
                                    title="Cancelar"
                                  >
                                    <X size={11} />
                                    <span>Cancelar</span>
                                  </button>
                                </>
                              )}
                              {msg.status === 'failed' && (
                                <button
                                  onClick={() => handleScheduledMessageAction(msg.id, 'fire_now')}
                                  className="text-emerald-600 hover:text-emerald-700 font-bold inline-flex items-center gap-0.5 cursor-pointer"
                                  title="Tentar Novamente"
                                >
                                  <RefreshCw size={11} />
                                  <span>Reenviar</span>
                                </button>
                              )}
                              {(msg.status === 'sent' || msg.status === 'cancelled') && (
                                <span className="text-[10px] text-slate-400 italic">Sem ações</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Dashboard and KPIs */}
          {activeSubTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Metric grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Jornadas Ativas</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-slate-800">{activeCount}</span>
                    <span className="text-[10px] text-slate-400 font-medium">fluxos</span>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Fila Pendente</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-slate-800">{pendingCount}</span>
                    <span className="text-[10px] text-slate-400 font-medium">envios</span>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Mensagens Enviadas</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-slate-800">{sentCount}</span>
                    <span className="text-[10px] text-slate-450 font-medium">sucesso</span>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Taxa de Sucesso</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-slate-800">{responseRate}%</span>
                    <span className="text-[10px] text-emerald-500 font-medium">conversão</span>
                  </div>
                </div>
              </div>

              {/* Relatórios Enterprise warning if PRO */}
              {plan === 'pro' && (
                <div className="bg-slate-50 border border-dashed border-slate-350 p-6 rounded-3xl text-center space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-sm mx-auto">
                    <Award size={22} />
                  </div>
                  <div className="space-y-1.5 max-w-sm mx-auto">
                    <h5 className="font-bold text-slate-800 text-xs">Métricas Avançadas e Relatórios Avançados</h5>
                    <p className="text-[10.5px] text-slate-500 leading-normal">
                      A visualização de taxa de conversão detalhada por etapa, ROI estimado de campanhas e múltiplas jornadas ilimitadas são recursos exclusivos do plano **Enterprise**.
                    </p>
                  </div>
                  <Link
                    href="/billing"
                    className="bg-primary hover:bg-primary-hover text-white text-[11px] font-extrabold px-4.5 py-2 rounded-xl transition-all shadow-sm shadow-primary/15 inline-block"
                  >
                    Upgrade para Enterprise
                  </Link>
                </div>
              )}

              {/* Relatórios completos se Enterprise */}
              {plan === 'enterprise' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Conversões */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b pb-2">Desempenho de Retenção</span>
                    <div className="space-y-3 font-semibold text-slate-700 text-xs">
                      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                        <span>Clientes Retornaram</span>
                        <span className="font-mono text-emerald-600 font-bold">+12%</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                        <span>Receitas Geradas em Pós-Venda</span>
                        <span className="font-mono text-slate-800 font-bold">R$ 4.850,00</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                        <span>Taxa de Opt-out</span>
                        <span className="font-mono text-rose-500 font-bold">0.8%</span>
                      </div>
                    </div>
                  </div>

                  {/* Funil de conversão */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b pb-2">Funil de Jornadas</span>
                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                          <span>ETAPA 1 (AGRADECIMENTO)</span>
                          <span>100% de alcance</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-primary h-full rounded-full" style={{ width: '100%' }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                          <span>ETAPA 2 (RETORNO PREVENTIVO)</span>
                          <span>85% de alcance</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-primary/80 h-full rounded-full" style={{ width: '85%' }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                          <span>ETAPA 3 (CAMPANHA RECORRENTE)</span>
                          <span>45% de alcance</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-primary/50 h-full rounded-full" style={{ width: '45%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* CREATE / EDIT JOURNEY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6.5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 border-b pb-3 mb-5">
              <Route size={18} className="text-primary" />
              <span>{editingJourney ? 'Editar Jornada Inteligente' : 'Criar Nova Jornada Comercial'}</span>
            </h3>

            {error && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-150 text-rose-700 text-xs font-semibold p-3.5 rounded-xl mb-4">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-150 text-emerald-700 text-xs font-semibold p-3.5 rounded-xl mb-4">
                <Check size={15} />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSaveJourney} className="space-y-4 text-xs font-medium text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Nome da Jornada</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Pós-Venda Ótica Ray-Ban"
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary focus:bg-white rounded-xl py-2.5 px-3.5 outline-none transition-all font-bold text-slate-800 text-[12px]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Gatilho (Trigger)</label>
                  <select
                    value={formTrigger}
                    onChange={(e) => setFormTrigger(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary focus:bg-white rounded-xl py-2.5 px-3.5 outline-none transition-all cursor-pointer font-bold text-slate-800 text-[12px]"
                  >
                    <option value="tag_added">Tag Adicionada</option>
                    <option value="deal_won">Oportunidade Ganha (Kanban)</option>
                    <option value="conversation_closed">Atendimento Concluído (Chat)</option>
                    <option value="manual">Manual (Agendamento sob demanda)</option>
                  </select>
                </div>
              </div>

              {formTrigger === 'tag_added' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Tag que inicia o fluxo</label>
                  <input
                    type="text"
                    required
                    value={formTriggerTag}
                    onChange={(e) => setFormTriggerTag(e.target.value)}
                    placeholder="Ex: pos-venda"
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary focus:bg-white rounded-xl py-2.5 px-3.5 outline-none transition-all font-mono text-slate-800 text-[11.5px]"
                  />
                </div>
              )}

              {/* Editable steps list */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Etapas de Mensagens</span>
                  <button
                    type="button"
                    onClick={addFormStep}
                    className="text-primary hover:text-primary-hover font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Adicionar Etapa</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {formSteps.map((step, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3 relative">
                      <button
                        type="button"
                        onClick={() => removeFormStep(idx)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 cursor-pointer"
                        title="Remover Etapa"
                      >
                        <X size={14} />
                      </button>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="text-[9px] font-extrabold text-slate-400 uppercase block mb-1">Nome da Etapa</label>
                          <input
                            type="text"
                            required
                            value={step.name}
                            onChange={(e) => updateFormStep(idx, { name: e.target.value })}
                            placeholder="Agradecimento inicial"
                            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 outline-none text-[11px] font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-extrabold text-slate-400 uppercase block mb-1">Atraso (Delay)</label>
                          <div className="flex gap-1.5">
                            <input
                              type="number"
                              required
                              min={1}
                              value={step.delayValue}
                              onChange={(e) => updateFormStep(idx, { delayValue: Number(e.target.value) })}
                              className="w-14 bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 outline-none text-[11px] font-mono text-center font-bold"
                            />
                            <select
                              value={step.delayUnit}
                              onChange={(e) => updateFormStep(idx, { delayUnit: e.target.value as any })}
                              className="flex-1 bg-white border border-slate-200 rounded-lg py-1.5 px-1 outline-none text-[10px] font-bold cursor-pointer"
                            >
                              <option value="minutes">Minuto(s)</option>
                              <option value="hours">Hora(s)</option>
                              <option value="days">Dia(s)</option>
                              <option value="weeks">Semana(s)</option>
                              <option value="months">Mês(es)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-extrabold text-slate-400 uppercase block mb-1">Mensagem (Template)</label>
                        <textarea
                          rows={2.5}
                          required
                          value={step.message}
                          onChange={(e) => updateFormStep(idx, { message: e.target.value })}
                          placeholder="Digite a mensagem..."
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2.5 outline-none text-[11.5px]"
                        />
                        <div className="flex flex-wrap gap-1 mt-1.5 text-[8.5px] text-slate-400 font-mono">
                          <span>Tags:</span>
                          <span className="bg-slate-200 text-slate-600 px-1 rounded hover:bg-slate-300 cursor-pointer" onClick={() => updateFormStep(idx, { message: step.message + '{primeiroNome}' })}>{'{primeiroNome}'}</span>
                          <span className="bg-slate-200 text-slate-600 px-1 rounded hover:bg-slate-300 cursor-pointer" onClick={() => updateFormStep(idx, { message: step.message + '{nome}' })}>{'{nome}'}</span>
                          <span className="bg-slate-200 text-slate-600 px-1 rounded hover:bg-slate-300 cursor-pointer" onClick={() => updateFormStep(idx, { message: step.message + '{produto}' })}>{'{produto}'}</span>
                          <span className="bg-slate-200 text-slate-600 px-1 rounded hover:bg-slate-300 cursor-pointer" onClick={() => updateFormStep(idx, { message: step.message + '{valor}' })}>{'{valor}'}</span>
                          <span className="bg-slate-200 text-slate-600 px-1 rounded hover:bg-slate-300 cursor-pointer" onClick={() => updateFormStep(idx, { message: step.message + '{dataCompra}' })}>{'{dataCompra}'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3.5 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-650 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-primary/15 flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? 'Salvando...' : editingJourney ? 'Salvar Alterações' : 'Criar Jornada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
