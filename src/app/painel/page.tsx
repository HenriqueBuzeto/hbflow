'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { ShieldAlert, Clock, User, ChevronRight, Bookmark } from 'lucide-react';

export default function PainelAtendimentosPage() {
  const router = useRouter();
  const { conversations, contacts, users, departments } = useStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert size={24} className="text-primary" />
          Painel de Atendimentos Geral
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Visão panorâmica em tempo real. Monitore diálogos em andamento, tempos de resposta e atribuições de filas de todos os clientes.
        </p>
      </div>

      {/* Grid wrapper */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {conversations.length === 0 ? (
          <div className="col-span-full bg-white border border-dashed p-12 text-center text-xs text-slate-400 rounded-3xl">
            Nenhuma conversação ativa no momento.
          </div>
        ) : (
          conversations.map((c) => {
            const contact = contacts.find((ct) => ct.id === c.contactId);
            const agent = users.find((u) => u.id === c.assignedUserId);
            const dept = departments.find((d) => d.id === c.departmentId);
            const lastMsg = c.messages[c.messages.length - 1];

            return (
              <div
                key={c.id}
                onClick={() => router.push('/inbox')}
                className="bg-white border border-slate-200 hover:border-primary rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-48 group relative"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-primary transition-colors">
                        {contact?.name}
                      </h4>
                      <span className="text-[9.5px] text-slate-400 block mt-0.5">{contact?.phone}</span>
                    </div>

                    <span className={`text-[8.5px] font-extrabold uppercase px-2 py-0.5 rounded ${
                      c.status === 'new' ? 'bg-amber-100 text-amber-700' : c.status === 'closed' ? 'bg-slate-100 text-slate-500' : 'bg-primary/10 text-primary'
                    }`}>
                      {c.status === 'new' ? 'Novo' : c.status === 'closed' ? 'Resolvido' : 'Em Aberto'}
                    </span>
                  </div>

                  {/* Snippet */}
                  <p className="text-xs text-slate-500 line-clamp-2 mt-3 leading-relaxed italic border-l-2 border-slate-200 pl-2">
                    &quot;{lastMsg ? lastMsg.body : 'Sem mensagens no histórico.'}&quot;
                  </p>
                </div>

                {/* Footer metrics */}
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-semibold shrink-0">
                  <div className="flex items-center gap-1.5">
                    {dept ? (
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dept.color }} title={dept.name} />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300" title="Sem Setor" />
                    )}
                    <span className="truncate max-w-[80px]">{dept?.name || 'Fila Geral'}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <User size={12} className="text-slate-400" />
                    <span className="truncate max-w-[80px]">{agent?.name || 'Sem Atendente'}</span>
                  </div>

                  <span className="text-slate-400 text-[9px] flex items-center gap-0.5 group-hover:text-primary transition-colors">
                    Ver inbox <ChevronRight size={10} />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
