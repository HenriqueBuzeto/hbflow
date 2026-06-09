'use client';

import React, { useState } from 'react';
import { Settings, Save, Clock, ShieldCheck, Check, Info } from 'lucide-react';

export default function ConfigsPage() {
  const [allowSig, setAllowSig] = useState(true);
  const [sigPos, setSigPos] = useState<'end' | 'start'>('end');
  const [slaTime, setSlaTime] = useState(15);
  const [maxWorkload, setMaxWorkload] = useState(10);
  const [success, setSuccess] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('Políticas globais salvas e atualizadas com sucesso!');
    setTimeout(() => setSuccess(''), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings size={24} className="text-primary" />
          Configurações do Sistema
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Ajuste as diretrizes globais do inquilino (Tenant). Configure limites de concorrência, políticas de assinatura e regras de SLA.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form panel */}
        <div className="md:col-span-2">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Parâmetros Gerais</h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs font-medium text-slate-700">
              {/* Signature Policy */}
              <div className="space-y-2 border-b pb-4">
                <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider block">Políticas de Assinatura</span>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block font-bold">Ativar Assinatura dos Atendentes</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Força o envio da assinatura nas respostas de WhatsApp</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowSig}
                    onChange={(e) => setAllowSig(e.target.checked)}
                    className="w-4 h-4 text-primary accent-primary cursor-pointer rounded"
                  />
                </div>

                {allowSig && (
                  <div className="pt-2">
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Posição Padrão</label>
                    <select
                      value={sigPos}
                      onChange={(e) => setSigPos(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs outline-none focus:border-primary"
                    >
                      <option value="end">No final da mensagem</option>
                      <option value="start">No início da mensagem</option>
                    </select>
                  </div>
                )}
              </div>

              {/* SLAs & Limits */}
              <div className="space-y-3 border-b pb-4">
                <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider block">Limites e SLAs</span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Tempo Limite de Primeira Resposta (min)</label>
                    <input
                      type="number"
                      value={slaTime}
                      onChange={(e) => setSlaTime(parseInt(e.target.value) || 15)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Carga Máxima de Atendente (chats)</label>
                    <input
                      type="number"
                      value={maxWorkload}
                      onChange={(e) => setMaxWorkload(parseInt(e.target.value) || 10)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Business hours info link */}
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <span className="font-bold block">Expediente Comercial (Horário de Atendimento)</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Configura se o chatbot deve dar resposta de indisponibilidade fora do horário.</span>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full border">
                  Seg-Sex: 08:00 - 18:00
                </span>
              </div>

              {success && (
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-[11px] font-bold p-3 rounded-xl border border-emerald-100">
                  <Check size={14} />
                  <span>{success}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Save size={14} />
                <span>Salvar Configurações Globais</span>
              </button>
            </form>
          </div>
        </div>

        {/* Info Column */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3.5">
            <h4 className="text-xs font-bold text-slate-800 border-b pb-2 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-primary" />
              Auditoria de Segurança
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Toda alteração de políticas gera uma trilha no console de auditoria de segurança (Audit Log) da empresa.
            </p>
            <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <Info size={14} className="text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-600 leading-normal">
                Modificar a carga máxima altera dinamicamente os pesos do algoritmo de roteamento inteligente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
