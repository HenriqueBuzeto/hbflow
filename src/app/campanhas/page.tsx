'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Megaphone, Plus, Calendar, CheckSquare, BarChart, Percent, CheckCircle, Trash2, X } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  templateName: string;
  targetTag: string;
  totalTargets: number;
  sentCount: number;
  readCount: number;
  status: 'draft' | 'sending' | 'completed';
  scheduledAt: string;
}

export default function CampanhasPage() {
  const { templates } = useStore();
  const [campaignList, setCampaignList] = useState<Campaign[]>([
    { id: '1', name: 'Campanha Reengajamento Junho', templateName: 'lembrete_proposta', targetTag: 'vendas', totalTargets: 140, sentCount: 112, readCount: 88, status: 'sending', scheduledAt: '2026-06-08T18:00' },
    { id: '2', name: 'Confirmação Cobrança PIX', templateName: 'confirmacao_pagamento', targetTag: 'financeiro', totalTargets: 54, sentCount: 54, readCount: 50, status: 'completed', scheduledAt: '2026-06-05T09:00' }
  ]);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [targetTag, setTargetTag] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !templateName || !targetTag) return;

    const newCamp: Campaign = {
      id: `camp-${Date.now()}`,
      name,
      templateName,
      targetTag,
      totalTargets: 85, // mock size
      sentCount: 0,
      readCount: 0,
      status: 'draft',
      scheduledAt: scheduledAt || new Date().toISOString().slice(0, 16)
    };

    setCampaignList([newCamp, ...campaignList]);
    setName('');
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    setCampaignList(campaignList.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Megaphone size={24} className="text-primary" />
            Campanhas de Disparo (Broadcasting)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Planeje envios em massa de templates oficiais. Monitore taxas de entrega, leitura e evite bloqueios de spam seguindo regras de delay.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-primary/10 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={16} />
          <span>Nova Campanha</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaigns Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Campanhas Registradas</h3>

            <div className="space-y-4">
              {campaignList.map((camp) => {
                const percentSent = Math.round((camp.sentCount / camp.totalTargets) * 100) || 0;
                const percentRead = Math.round((camp.readCount / camp.sentCount) * 100) || 0;

                return (
                  <div key={camp.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex flex-col gap-3 text-xs font-medium">
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="text-slate-800 text-sm block leading-tight">{camp.name}</strong>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Template: <code className="bg-slate-200/60 px-1 rounded">{camp.templateName}</code> • Tag Alvo: <span className="font-bold text-slate-600">#{camp.targetTag}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded ${
                          camp.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : camp.status === 'sending' ? 'bg-primary/10 text-primary animate-pulse' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {camp.status === 'completed' ? 'Completo' : camp.status === 'sending' ? 'Disparando' : 'Rascunho'}
                        </span>
                        <button onClick={() => handleDelete(camp.id)} className="text-slate-400 hover:text-rose-500">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>Progresso de Envio</span>
                        <span>{camp.sentCount} de {camp.totalTargets} contatos ({percentSent}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-300"
                          style={{ width: `${percentSent}%` }}
                        />
                      </div>
                    </div>

                    {/* Delivery metrics */}
                    <div className="grid grid-cols-2 gap-4 mt-1 text-[10px] text-slate-500 font-bold pt-2 border-t border-dashed border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Percent size={12} className="text-primary" />
                        <span>Taxa de Leitura: <strong className="text-slate-700">{percentRead}%</strong> ({camp.readCount} aberturas)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400" />
                        <span>Agendado: <strong className="text-slate-700">{new Date(camp.scheduledAt).toLocaleString()}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Campaign Info */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3.5">
            <h4 className="text-xs font-bold text-slate-800 border-b pb-2 flex items-center gap-1.5">
              <BarChart size={14} className="text-primary" />
              Diretrizes de Antispam (Meta API)
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              O Meta WhatsApp Business aplica limites de mensagens baseados na qualidade do número (Tier 1: 1k/dia, Tier 2: 10k/dia, Tier 3: 100k/dia).
            </p>
            <ul className="text-[11px] text-slate-600 space-y-1.5 pl-4 list-disc">
              <li>Use sempre templates aprovados e evite palavras sensíveis.</li>
              <li>O HBFlow aplica um atraso automático (delay) de 4 a 8 segundos entre disparos para simular digitação e proteger a saúde do número.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* CREATE DIALOG */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="text-sm font-bold text-slate-800">Criar Nova Campanha de Disparo</h4>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs font-medium">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Título da Campanha</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Promoção Dia dos Pais"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tag Alvo do CRM</label>
                  <select
                    value={targetTag}
                    onChange={(e) => setTargetTag(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    <option value="vendas">#vendas</option>
                    <option value="financeiro">#financeiro</option>
                    <option value="vip">#vip</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Modelo de Envio</label>
                  <select
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Agendamento (Data/Hora)</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary-hover"
                >
                  Salvar Rascunho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
