'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { UserCheck, Plus, Check, Settings, ShieldAlert, Shield } from 'lucide-react';

export default function UsuariosPage() {
  const { users, currentUserId } = useStore();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [success, setSuccess] = useState('');

  const selectedAgent = users.find((u) => u.id === selectedAgentId);

  const handleSaveFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('Filtros de atendimento do agente salvos com sucesso!');
    setTimeout(() => {
      setSuccess('');
      setSelectedAgentId(null);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck size={24} className="text-primary" />
            Gestão de Usuários e Atendentes
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre novos atendentes, configure permissões por perfil (Admin, Gestor, Comercial) e defina as filas de triagem que cada um pode assumir.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users list table */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                  <tr>
                    <th className="px-6 py-4">Nome</th>
                    <th className="px-6 py-4">Contato</th>
                    <th className="px-6 py-4">Fila (Setores)</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-medium text-slate-700">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-primary/20"
                          />
                          <div>
                            <span className="font-bold text-slate-800 block">{user.name}</span>
                            <span className="text-[10px] text-slate-400 mt-0.5 block">{user.role}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-slate-500 block font-mono">{user.email}</span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {user.filters.map((f) => (
                            <span key={f} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full capitalize font-semibold border border-slate-200/50">
                              {f}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          user.isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {user.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedAgentId(user.id)}
                          className="text-primary hover:underline font-bold inline-flex items-center gap-0.5"
                        >
                          <Settings size={12} />
                          <span>Filtros</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Filters config side panel */}
        <div>
          {selectedAgent ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 border-b pb-2 flex items-center gap-1">
                <Shield size={14} className="text-primary" />
                Filtros: {selectedAgent.name}
              </h3>

              <form onSubmit={handleSaveFilters} className="space-y-4 text-xs font-medium text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Filas Vinculadas</span>
                  <div className="space-y-2">
                    {['vendas', 'financeiro', 'manutencao', 'cobranca', 'garantia'].map((f) => {
                      const isLinked = selectedAgent.filters.includes(f);
                      return (
                        <div key={f} className="flex items-center justify-between">
                          <span className="capitalize font-semibold text-slate-700">{f}</span>
                          <input
                            type="checkbox"
                            defaultChecked={isLinked}
                            className="w-4 h-4 text-primary accent-primary cursor-pointer rounded"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {success && (
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-[10.5px] font-bold p-3 rounded-xl border border-emerald-100">
                    <Check size={14} />
                    <span>{success}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Salvar Filtros
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAgentId(null)}
                    className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl"
                  >
                    Fechar
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-3xl p-6 text-center text-xs text-slate-400">
              Selecione um atendente na tabela para configurar suas prioridades e filtros de distribuição de triagem.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
