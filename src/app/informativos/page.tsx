'use client';

import React from 'react';
import { Info, Bell, CheckCircle2 } from 'lucide-react';

export default function InformativosPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Info size={24} className="text-primary" />
          Mural de Informativos
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Acompanhe novidades da plataforma, alertas de atualização e status operacional das conexões da Cloud API.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
          <Bell size={18} className="text-primary shrink-0 mt-0.5" />
          <div className="text-xs font-medium">
            <strong className="text-slate-800 block text-sm">Atualização HBFlow v1.2.0 Estável</strong>
            <p className="text-slate-600 mt-1.5 leading-relaxed">
              Liberada a nova versão do motor de chatbot com roteamento hierárquico por submenus. Agora você pode parametrizar caminhos condicionais e logs de auditoria direto do painel.
            </p>
            <span className="text-[10px] text-slate-400 block mt-2">Postado em: 08/06/2026</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 p-3 rounded-2xl">
          <CheckCircle2 size={16} />
          <span>Todos os microsserviços estão operacionais. Latência média do webhook: 120ms.</span>
        </div>
      </div>
    </div>
  );
}
