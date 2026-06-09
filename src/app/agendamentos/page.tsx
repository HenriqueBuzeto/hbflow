'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Clock, Plus, Trash2, Calendar, User, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ScheduledItem {
  id: string;
  contactName: string;
  phone: string;
  message: string;
  sendAt: string;
  status: 'pending' | 'sent';
}

export default function AgendamentosPage() {
  const { contacts } = useStore();
  const [scheduledList, setScheduledList] = useState<ScheduledItem[]>([
    { id: '1', contactName: 'Mateus Oliveira', phone: '+55 11 98888-7777', message: 'Olá Mateus, passamos para lembrar do seu orçamento de óculos.', sendAt: '2026-06-10T10:00', status: 'pending' },
    { id: '2', contactName: 'Ana Costa', phone: '+55 21 97777-6666', message: 'Seu boleto da mensalidade foi emitido com sucesso.', sendAt: '2026-06-05T09:00', status: 'sent' }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [targetContactId, setTargetContactId] = useState('');
  const [message, setMessage] = useState('');
  const [dateTime, setDateTime] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const contactObj = contacts.find((c) => c.id === targetContactId);
    if (!contactObj || !message || !dateTime) return;

    const newItem: ScheduledItem = {
      id: `sch-${Date.now()}`,
      contactName: contactObj.name,
      phone: contactObj.phone,
      message,
      sendAt: dateTime,
      status: 'pending'
    };

    setScheduledList([newItem, ...scheduledList]);
    setTargetContactId('');
    setMessage('');
    setDateTime('');
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setScheduledList(scheduledList.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Clock size={24} className="text-primary" />
            Agendamentos de Mensagens
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Programe disparos de mensagens automáticas de WhatsApp para datas futuras. Ideal para cobranças recorrentes, pós-vendas e lembretes.
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-primary/10 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={16} />
          <span>Novo Agendamento</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LIST COLUMN */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center font-bold text-xs uppercase text-slate-700 tracking-wider">
              <span>Mensagens Programadas</span>
              <span className="text-[10px] text-slate-400 font-semibold">{scheduledList.length} agendamentos</span>
            </div>

            <div className="divide-y divide-slate-100">
              {scheduledList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Nenhum agendamento programado.</div>
              ) : (
                scheduledList.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row justify-between gap-4 sm:items-center text-xs font-medium">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-800">{item.contactName}</strong>
                        <span className="text-slate-400 font-mono">({item.phone})</span>
                      </div>
                      <p className="text-slate-600 font-normal leading-normal italic bg-slate-50 p-2.5 rounded-xl border">
                        &quot;{item.message}&quot;
                      </p>
                      <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(item.sendAt).toLocaleString()}
                        </span>
                        <span className={`flex items-center gap-1 ${
                          item.status === 'sent' ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {item.status === 'sent' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                          {item.status === 'sent' ? 'Enviado' : 'Aguardando Disparo'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-slate-400 hover:text-rose-500 p-2 hover:bg-slate-100 rounded-xl transition-all self-end sm:self-auto cursor-pointer"
                      title="Excluir agendamento"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* SIDE BAR / CHECKLIST */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-800 border-b pb-2 flex items-center gap-1.5">
              <AlertCircle size={14} className="text-primary" />
              Regras do Disparador
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Os agendamentos são verificados a cada 1 minuto por um worker backend (BullMQ + Redis).
            </p>
            <ul className="text-[11px] text-slate-600 space-y-1.5 pl-4 list-disc">
              <li>Mensagens só são enviadas se a janela de 24 horas do WhatsApp estiver aberta (caso contrário, o sistema disparará um template oficial aprovado).</li>
              <li>É possível usar tags variáveis dinâmicas como <code className="bg-slate-100 px-1 rounded font-mono">{"{{nome_cliente}}"}</code>.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="text-sm font-bold text-slate-800">Novo Agendamento WhatsApp</h4>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs font-medium">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Destinatário</label>
                <select
                  value={targetContactId}
                  onChange={(e) => setTargetContactId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">Selecione o cliente...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Data / Hora de Disparo</label>
                <input
                  type="datetime-local"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Mensagem</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Olá {{nome_cliente}}..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-primary text-slate-700 leading-normal"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary-hover"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
