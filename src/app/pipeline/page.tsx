'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Layers, ChevronRight, Check, X, User, DollarSign, Calendar, Plus, Clock } from 'lucide-react';

export default function PipelinePage() {
  const { conversations, deals, stages, contacts, users, moveDeal, updateDealStatus, addDeal } = useStore();
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [filterUser, setFilterUser] = useState<string>('all');
  const [timeTick, setTimeTick] = useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const getElapsedTime = (isoString: string | null) => {
    if (!isoString) return '';
    const diffMs = Date.now() - new Date(isoString).getTime();
    if (diffMs < 0) return '0s';
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    if (diffMins === 0) {
      return `${diffSecs}s`;
    }
    return `${diffMins}m ${diffSecs}s`;
  };

  // Modal won/lost
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReason, setLostReason] = useState('');

  // New Deal form quick add
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickValue, setQuickValue] = useState('800');
  const [quickContactId, setQuickContactId] = useState('');

  const activeDeal = deals.find((d) => d.id === selectedDealId);
  const activeContact = activeDeal ? contacts.find((c) => c.id === activeDeal.contactId) : null;

  // 1. DRAG AND DROP HANDLERS
  const handleDragStart = (dealId: string) => {
    setDraggedDealId(dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (stageId: string) => {
    if (draggedDealId) {
      moveDeal(draggedDealId, stageId);
      setDraggedDealId(null);
    }
  };

  // 2. STATUS CHANGERS
  const markAsWon = (dealId: string) => {
    updateDealStatus(dealId, 'won');
  };

  const openLostReason = (dealId: string) => {
    setSelectedDealId(dealId);
    setShowLostModal(true);
  };

  const submitLostReason = () => {
    if (selectedDealId && lostReason) {
      updateDealStatus(selectedDealId, 'lost', lostReason);
      setShowLostModal(false);
      setLostReason('');
    }
  };

  const executeQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickContactId || !quickTitle) return;

    addDeal({
      contactId: quickContactId,
      stageId: 'stage-1',
      assignedUserId: filterUser !== 'all' ? filterUser : null,
      title: quickTitle,
      value: parseFloat(quickValue) || 0,
      probability: 50,
      origin: 'Pipeline Quick Add',
      products: 'Consulta Geral',
      expectedClose: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'open',
      notes: 'Adicionado via painel Kanban.'
    });

    setQuickTitle('');
    setQuickContactId('');
    setShowQuickAdd(false);
  };

  // Filter deals by assignee
  const filteredDeals = deals.filter((d) => {
    if (filterUser !== 'all' && d.assignedUserId !== filterUser) return false;
    return true;
  });

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers size={24} className="text-primary" />
            Funil Comercial (Kanban)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Arraste os cartões de negócios para mudar de etapa ou clique para registrar notas e marcar como Ganho ou Perdido.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* User filter selector */}
          <div className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <User size={14} className="text-primary" />
            <span>Atendente:</span>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="text-slate-800 font-semibold bg-transparent border-none outline-none cursor-pointer"
            >
              <option value="all">Todos os Agentes</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Add Toggle */}
          <button
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md shadow-primary/10 flex items-center gap-1 cursor-pointer"
          >
            <Plus size={14} />
            <span>Criar Negócio</span>
          </button>
        </div>
      </div>

      {/* Quick Add Form Row */}
      {showQuickAdd && (
        <form onSubmit={executeQuickAdd} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap gap-4 items-end animate-in fade-in duration-150">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Título do Negócio</label>
            <input
              type="text"
              placeholder="Ex: Armação Rayban Titânio"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary focus:bg-white"
            />
          </div>

          <div className="min-w-[180px]">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cliente</label>
            <select
              value={quickContactId}
              onChange={(e) => setQuickContactId(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs outline-none focus:border-primary cursor-pointer font-medium"
            >
              <option value="">Selecione...</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="w-28">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Valor (R$)</label>
            <input
              type="number"
              value={quickValue}
              onChange={(e) => setQuickValue(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary focus:bg-white font-mono"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary-hover transition-colors"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setShowQuickAdd(false)}
              className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl hover:bg-slate-200"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Banner when no deals exist */}
      {deals.length === 0 && (
        <div className="bg-gradient-to-r from-primary/5 to-indigo-50/50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in duration-200">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Layers size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Nenhum negócio criado ainda.</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Crie uma oportunidade de vendas a partir do chat ou clique no botão &quot;Criar Negócio&quot; acima.
            </p>
          </div>
        </div>
      )}

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto pb-4 flex gap-4 select-none items-start min-h-[480px]">
        {stages.map((stage) => {
          const stageDeals = filteredDeals.filter(
            (d) => d.stageId === stage.id && d.status === 'open'
          );
          // Calculated stage value
          const stageSumValue = stageDeals.reduce((sum, d) => sum + d.value, 0);

          // Render closed status items conditionally in separate stages
          let displayedDeals = stageDeals;
          if (stage.id === 'stage-5') {
            displayedDeals = filteredDeals.filter((d) => d.status === 'won');
          } else if (stage.id === 'stage-6') {
            displayedDeals = filteredDeals.filter((d) => d.status === 'lost');
          }

          return (
            <div
              key={stage.id}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage.id)}
              className="w-72 bg-slate-100/70 border border-slate-200/50 rounded-2xl p-3 flex flex-col shrink-0 max-h-[600px] overflow-y-auto"
            >
              {/* Stage Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{stage.name}</h4>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                    {displayedDeals.length} negócios
                  </span>
                </div>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  R$ {stageSumValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </span>
              </div>

              {/* Deal Cards Container */}
              <div className="space-y-2.5 flex-1 min-h-[250px]">
                {displayedDeals.length === 0 ? (
                  <div className="h-full border border-dashed border-slate-300 rounded-xl flex items-center justify-center p-6 text-center text-[10px] text-slate-400">
                    {deals.length === 0 ? 'Nenhum negócio criado ainda.' : 'Solte cartões aqui'}
                  </div>
                ) : (
                  displayedDeals.map((deal) => {
                    const contact = contacts.find((c) => c.id === deal.contactId);
                    return (
                      <div
                        key={deal.id}
                        draggable={deal.status === 'open'}
                        onDragStart={() => handleDragStart(deal.id)}
                        onClick={() => setSelectedDealId(deal.id)}
                        className={`bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex flex-col gap-2 relative ${
                          deal.status === 'won' ? 'border-l-4 border-l-emerald-500' : deal.status === 'lost' ? 'border-l-4 border-l-rose-500' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-slate-800 leading-tight line-clamp-2">{deal.title}</span>
                          <span className="text-[10px] font-bold text-slate-800 shrink-0 font-mono">
                            R$ {deal.value.toFixed(0)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold shrink-0">
                            {contact?.name.charAt(0)}
                          </div>
                          <span className="text-[10px] text-slate-500 truncate">{contact?.name}</span>
                        </div>

                        {/* Attendance / Wait timer badge & Lead Score */}
                        {(() => {
                          const conv = conversations.find(c => c.contactId === deal.contactId && c.status !== 'closed');
                          if (!conv) return null;
                          return (
                            <div className="flex flex-col gap-1.5 mt-0.5">
                              <div className="flex items-center gap-1.5 text-[9px] font-semibold">
                                {conv.status === 'new' && conv.waitStartedAt && (
                                  <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                    <Clock size={10} className="animate-pulse" />
                                    <span>Espera: {getElapsedTime(conv.waitStartedAt)}</span>
                                  </span>
                                )}
                                {conv.status === 'open' && conv.claimedAt && (
                                  <span className="flex items-center gap-1 text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
                                    <Clock size={10} />
                                    <span>Atendimento: {getElapsedTime(conv.claimedAt)}</span>
                                  </span>
                                )}
                              </div>
                              {conv.aiLeadScore !== undefined && (
                                <div className="flex">
                                  <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${
                                    conv.aiLeadLabel === 'quente'
                                      ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/50'
                                      : conv.aiLeadLabel === 'morno'
                                      ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-455 dark:border-amber-900/50'
                                      : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/20 dark:text-slate-455 dark:border-slate-850'
                                  }`}>
                                    Score: {conv.aiLeadScore}% {conv.aiLeadLabel === 'quente' ? '🔥' : conv.aiLeadLabel === 'morno' ? '⏳' : '❄️'}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        <div className="flex justify-between items-center mt-1 pt-2 border-t border-slate-100 text-[9px] text-slate-400">
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar size={10} />
                            {deal.expectedClose}
                          </span>
                          <span className="font-semibold text-primary">{deal.probability}% prob.</span>
                        </div>

                        {/* Quick Won/Lost controls if open */}
                        {deal.status === 'open' && (
                          <div className="flex gap-1.5 mt-2 justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openLostReason(deal.id);
                              }}
                              className="p-1 hover:bg-rose-50 border border-slate-100 hover:border-rose-200 text-rose-500 rounded-lg transition-colors cursor-pointer"
                              title="Perdido"
                            >
                              <X size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsWon(deal.id);
                              }}
                              className="p-1 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                              title="Ganho"
                            >
                              <Check size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAIL SIDE PANEL */}
      {activeDeal && activeContact && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-slate-200 p-6 z-40 overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="flex justify-between items-start pb-4 border-b border-slate-100">
            <div>
              <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-400 block">Detalhes do Negócio</span>
              <h3 className="text-sm font-bold text-slate-800 mt-1">{activeDeal.title}</h3>
            </div>
            <button onClick={() => setSelectedDealId(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100">
              <X size={16} />
            </button>
          </div>

          <div className="py-4 space-y-4 text-xs">
            {/* Meta values */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-2.5 rounded-xl border">
                <span className="text-[10px] text-slate-500 font-semibold block">Valor do Negócio</span>
                <strong className="text-sm text-slate-800 font-mono">
                  {activeDeal.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border">
                <span className="text-[10px] text-slate-500 font-semibold block">Probabilidade</span>
                <strong className="text-sm text-slate-800 font-mono">{activeDeal.probability}%</strong>
              </div>
            </div>

            {/* General Info */}
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500 font-semibold">Cliente:</span>
                <span className="text-slate-800 font-bold">{activeContact.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500 font-semibold">Telefone WhatsApp:</span>
                <span className="text-slate-800 font-mono">{activeContact.phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500 font-semibold">Origem:</span>
                <span className="text-slate-800 font-medium capitalize">{activeDeal.origin}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500 font-semibold">Produtos:</span>
                <span className="text-slate-800 font-medium">{activeDeal.products}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500 font-semibold">Status:</span>
                <span className={`font-bold uppercase text-[10px] ${
                  activeDeal.status === 'won' ? 'text-emerald-600' : activeDeal.status === 'lost' ? 'text-rose-600' : 'text-primary'
                }`}>
                  {activeDeal.status === 'won' ? 'Ganho' : activeDeal.status === 'lost' ? 'Perdido' : 'Em Aberto'}
                </span>
              </div>
              {(() => {
                const conv = conversations.find(c => c.contactId === activeDeal.contactId && c.status !== 'closed');
                if (!conv || conv.aiLeadScore === undefined) return null;
                return (
                  <div className="flex justify-between py-1 border-b items-center">
                    <span className="text-slate-500 font-semibold">Lead Score (IA):</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                      conv.aiLeadLabel === 'quente'
                        ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50'
                        : conv.aiLeadLabel === 'morno'
                        ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50'
                        : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-850'
                    }`}>
                      {conv.aiLeadScore}% ({conv.aiLeadLabel === 'quente' ? 'Quente 🔥' : conv.aiLeadLabel === 'morno' ? 'Morno ⏳' : 'Frio ❄️'})
                    </span>
                  </div>
                );
              })()}
              {activeDeal.status === 'lost' && (
                <div className="bg-rose-50 text-rose-800 p-2.5 rounded-xl border border-rose-100 mt-2">
                  <span className="font-bold text-[10px] block">Motivo da Perda:</span>
                  <p className="mt-0.5">{activeDeal.lostReason}</p>
                </div>
              )}
            </div>

            {/* Activities Timeline */}
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block mb-3">Histórico de Atividades</span>
              <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200">
                {activeDeal.activities.map((act) => (
                  <div key={act.id} className="flex gap-3 relative pl-6 text-[11px]">
                    <div className="w-4 h-4 rounded-full bg-slate-200 border border-white absolute left-0 top-0.5 flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>
                    <div>
                      <p className="text-slate-700 leading-normal">{act.content}</p>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOST REASON MODAL */}
      {showLostModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Motivo do Fechamento Perdido</h4>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Motivo / Notas</label>
              <textarea
                rows={3}
                placeholder="Ex: Preço muito alto, comprou com concorrente, sem estoque..."
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-primary focus:bg-white"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowLostModal(false)}
                className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl"
              >
                Voltar
              </button>
              <button
                onClick={submitLostReason}
                disabled={!lostReason.trim()}
                className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                Registrar Perda
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
