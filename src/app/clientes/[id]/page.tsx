'use client';

import React, { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import {
  ArrowLeft,
  Award,
  Calendar,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Briefcase
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClienteDossierPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  const { contacts, deals, tasks, conversations, addTask, toggleTask, users } = useStore();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<'call' | 'proposal' | 'follow_up' | 'meeting'>('call');
  const [newTaskDue, setNewTaskDue] = useState('');

  const contact = contacts.find((c) => c.id === id);
  if (!contact) {
    return (
      <div className="p-8 text-center bg-white border rounded-2xl">
        <AlertCircle className="mx-auto text-rose-500 mb-2" />
        <h4 className="text-sm font-bold text-slate-700">Cliente Não Encontrado</h4>
        <button onClick={() => router.push('/clientes')} className="text-xs text-primary font-bold mt-4">
          Voltar para CRM
        </button>
      </div>
    );
  }

  // Linked items
  const contactDeals = deals.filter((d) => d.contactId === contact.id);
  const contactTasks = tasks.filter((t) => t.contactId === contact.id);
  const contactConvs = conversations.filter((c) => c.contactId === contact.id);

  // Generate mock timeline items based on linked data
  const timelineEvents = [
    { type: 'system', text: 'Contato criado no sistema.', date: contact.firstContactAt },
    ...contactDeals.map((d) => ({
      type: 'deal',
      text: `Oportunidade criada: "${d.title}" (R$ ${d.value}) na etapa ${d.status === 'won' ? 'Ganho' : d.status === 'lost' ? 'Perdido' : 'Em Aberto'}.`,
      date: d.createdAt
    })),
    ...contactTasks.map((t) => ({
      type: 'task',
      text: `Tarefa cadastrada: "${t.title}" (Vence: ${new Date(t.dueAt).toLocaleDateString()}).`,
      date: t.dueAt // approximate for sorting
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle || !newTaskDue) return;

    addTask({
      contactId: contact.id,
      dealId: null,
      assignedUserId: 'user-1', // João default
      title: newTaskTitle,
      type: newTaskType,
      dueAt: new Date(newTaskDue).toISOString(),
      priority: 'medium',
      notes: ''
    });

    setNewTaskTitle('');
    setNewTaskDue('');
  };

  return (
    <div className="space-y-6">
      {/* Back nav & Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/clientes')}
          className="p-2 hover:bg-slate-200 border bg-white border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Perfil 360° do Cliente</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Dossiê completo contendo timeline de atendimento, tarefas agendadas e oportunidades financeiras.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMN 1: Profile card info */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-3xl mb-4">
              {contact.name.charAt(0)}
            </div>
            <h3 className="text-base font-bold text-slate-800">{contact.name}</h3>
            <span className="text-[10px] bg-slate-100 text-slate-600 border px-2 py-0.5 rounded-full font-bold uppercase block mt-1">
              Origem: {contact.origin}
            </span>

            {/* Score box */}
            <div className="mt-4 flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl px-4 py-1.5">
              <Award size={15} className="text-amber-500" />
              <span className="text-xs font-bold text-slate-700">Comercial Score: {contact.score}/100</span>
            </div>

            {/* Faturamento */}
            <div className="mt-4 pt-4 border-t border-slate-100 w-full flex justify-between text-xs">
              <span className="text-slate-400 font-semibold">Total Comprado:</span>
              <strong className="text-slate-800 font-bold font-mono">
                {contact.totalPurchased.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </strong>
            </div>
          </div>

          {/* Details metadata */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3.5 text-xs">
            <h4 className="text-xs font-bold text-slate-800 border-b pb-2">Dados Cadastrais</h4>

            <div className="flex items-center gap-3">
              <Phone size={14} className="text-slate-400 shrink-0" />
              <span className="text-slate-600 font-mono">{contact.phone}</span>
            </div>

            <div className="flex items-center gap-3">
              <Mail size={14} className="text-slate-400 shrink-0" />
              <span className="text-slate-600 truncate">{contact.email || 'E-mail não informado'}</span>
            </div>

            <div className="flex items-center gap-3">
              <MapPin size={14} className="text-slate-400 shrink-0" />
              <span className="text-slate-600">
                {contact.city ? `${contact.city} - ${contact.state}` : 'Endereço não informado'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <FileText size={14} className="text-slate-400 shrink-0" />
              <span className="text-slate-600 font-mono">CPF/CNPJ: {contact.document || 'Não informado'}</span>
            </div>

            <div className="pt-2">
              <span className="text-[10px] text-slate-400 font-bold block mb-1">Notas Internas</span>
              <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border leading-relaxed">
                {contact.notes || 'Sem observações cadastradas.'}
              </p>
            </div>
          </div>
        </div>

        {/* COLUMN 2 & 3: Opportunities, Tasks, and Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Opportunities Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-1.5">
              <Briefcase size={15} className="text-primary" />
              Oportunidades Financeiras ({contactDeals.length})
            </h3>
            {contactDeals.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhum negócio ativo ou finalizado para este cliente.</p>
            ) : (
              <div className="space-y-2">
                {contactDeals.map((d) => (
                  <div key={d.id} className="border border-slate-100 rounded-xl p-3 flex justify-between items-center bg-slate-50/50">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">{d.title}</span>
                      <span className="text-[10px] text-slate-400 mt-1 block">Produtos: {d.products}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-800 font-mono block">R$ {d.value}</span>
                      <span className={`text-[9px] font-bold uppercase mt-1 inline-block ${
                        d.status === 'won' ? 'text-emerald-600' : d.status === 'lost' ? 'text-rose-600' : 'text-primary'
                      }`}>
                        {d.status === 'won' ? 'Ganho' : d.status === 'lost' ? 'Perdido' : 'Em Aberto'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tasks & Checklist */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-1.5">
              <CheckCircle size={15} className="text-primary" />
              Checklist de Follow-up ({contactTasks.length})
            </h3>

            {/* Quick add task */}
            <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Próxima ação comercial..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs outline-none focus:border-primary focus:bg-white"
              />
              <select
                value={newTaskType}
                onChange={(e) => setNewTaskType(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-600 cursor-pointer"
              >
                <option value="call">Ligar</option>
                <option value="proposal">Proposta</option>
                <option value="meeting">Reunião</option>
              </select>
              <input
                type="date"
                value={newTaskDue}
                onChange={(e) => setNewTaskDue(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-600"
              />
              <button
                type="submit"
                className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 hover:bg-primary-hover"
              >
                <Plus size={14} />
                <span>Adicionar</span>
              </button>
            </form>

            {/* Task list */}
            {contactTasks.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhuma tarefa agendada para este contato.</p>
            ) : (
              <div className="space-y-2">
                {contactTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={t.status === 'completed'}
                        onChange={() => toggleTask(t.id)}
                        className="w-4 h-4 text-primary accent-primary cursor-pointer rounded"
                      />
                      <div>
                        <span className={`text-xs font-semibold ${t.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                          {t.title}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Vence em: {new Date(t.dueAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded capitalize ${
                      t.priority === 'high' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline of events */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-1.5">
              <Clock size={15} className="text-primary" />
              Linha do Tempo
            </h3>

            <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200">
              {timelineEvents.map((evt, idx) => (
                <div key={idx} className="flex gap-4 relative pl-8 text-xs">
                  <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white absolute left-0 top-0 flex items-center justify-center shrink-0 shadow-sm">
                    {evt.type === 'deal' ? (
                      <Briefcase size={10} className="text-primary" />
                    ) : evt.type === 'task' ? (
                      <Calendar size={10} className="text-emerald-600" />
                    ) : (
                      <FileText size={10} className="text-blue-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-slate-700 font-semibold leading-normal">{evt.text}</p>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {new Date(evt.date).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
