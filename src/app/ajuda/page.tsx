'use client';

import React from 'react';
import { HelpCircle, FileText, ArrowRight, LifeBuoy } from 'lucide-react';

export default function AjudaPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle size={24} className="text-primary" />
          Central de Ajuda & Documentação
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Acesse tutoriais, guias rápidos de integração e boas práticas para evitar bloqueios de spam na Meta Business Suite.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <FileText size={16} />
            <span>Guia do Inbox</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Como puxar atendimentos, direcionar conversas para outros setores ou atendentes, e vincular conversas de WhatsApp a leads do Kanban.
          </p>
          <a href="/inbox" className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
            Ir para Atendimentos <ArrowRight size={12} />
          </a>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <LifeBuoy size={16} />
            <span>Regras do WhatsApp Cloud API</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Aprenda a cadastrar templates oficiais de utilidade ou marketing no portal Meta Developers e sincronizar com o HBFlow.
          </p>
          <a href="/conexao" className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
            Configurar Conexão <ArrowRight size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
