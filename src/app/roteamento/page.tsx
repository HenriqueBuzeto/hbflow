'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { ShieldCheck, ListFilter, Play, ArrowRight, User, Terminal } from 'lucide-react';

export default function RoteamentoPage() {
  const { routingLogs, departments } = useStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck size={24} className="text-primary" />
          Logs de Roteamento Inteligente
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitore em tempo real os disparos de palavras-chave, redirecionamentos automáticos por menu e balanceamento de carga de trabalho.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Logs Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ListFilter size={14} className="text-primary" />
                Histórico de Distribuições Recentes
              </h3>
              <span className="text-[10px] text-slate-400">Total: {routingLogs.length} eventos</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-4">Cliente / Origem</th>
                    <th className="px-6 py-4">Destino (Setor / Agente)</th>
                    <th className="px-6 py-4">Gatilho / Motivo</th>
                    <th className="px-6 py-4 text-right">Data / Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {routingLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                        Nenhum evento de roteamento automático registrado ainda. Dispare mensagens de simulação no topo da tela para ver os logs popularem.
                      </td>
                    </tr>
                  ) : (
                    routingLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{log.contactName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            {log.departmentName ? (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold px-2 py-0.5 rounded-full">
                                {log.departmentName}
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                Fila Geral
                              </span>
                            )}
                            {log.assignedUserName && (
                              <>
                                <ArrowRight size={10} className="text-slate-400" />
                                <span className="text-xs font-semibold text-slate-700 flex items-center gap-0.5">
                                  <User size={10} className="text-slate-400" />
                                  {log.assignedUserName}
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-600 italic leading-relaxed">{log.routingReason}</span>
                        </td>
                        <td className="px-6 py-4 text-right text-[10px] text-slate-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Rules summary */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-800 border-b pb-2 flex items-center gap-1.5">
              <Play size={14} className="text-emerald-500" />
              Diretrizes de Roteamento
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              O sistema analisa a primeira mensagem do contato e aplica a seguinte lógica:
            </p>
            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                <span className="font-bold text-[10px] text-indigo-600 block">Vendas / Comercial</span>
                <p className="text-[10.5px] mt-0.5 leading-relaxed text-slate-600">
                  Gatilhos: <code className="font-mono bg-slate-200/60 px-1 rounded">preço</code>, <code className="font-mono bg-slate-200/60 px-1 rounded">orçamento</code>, <code className="font-mono bg-slate-200/60 px-1 rounded">comprar</code>.
                </p>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                <span className="font-bold text-[10px] text-blue-600 block">Financeiro / Faturamento</span>
                <p className="text-[10.5px] mt-0.5 leading-relaxed text-slate-600">
                  Gatilhos: <code className="font-mono bg-slate-200/60 px-1 rounded">boleto</code>, <code className="font-mono bg-slate-200/60 px-1 rounded">pagamento</code>, <code className="font-mono bg-slate-200/60 px-1 rounded">pix</code>.
                </p>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                <span className="font-bold text-[10px] text-emerald-600 block">Manutenção / Garantia</span>
                <p className="text-[10.5px] mt-0.5 leading-relaxed text-slate-600">
                  Gatilhos: <code className="font-mono bg-slate-200/60 px-1 rounded">quebrou</code>, <code className="font-mono bg-slate-200/60 px-1 rounded">defeito</code>, <code className="font-mono bg-slate-200/60 px-1 rounded">garantia</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Console logger */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm h-[200px] flex flex-col">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-2 border-b border-slate-800 pb-1.5 flex items-center gap-1">
              <Terminal size={12} className="text-primary" />
              Logs de Concorrência
            </span>
            <div className="flex-1 overflow-y-auto font-mono text-[9px] text-slate-300 space-y-1">
              <div><span className="text-emerald-500">&gt;</span> claimChat(convId, userId): transação iniciada.</div>
              <div><span className="text-emerald-500">&gt;</span> SELECT assignedUserId FROM conversation WHERE id = convId FOR UPDATE;</div>
              <div><span className="text-emerald-500">&gt;</span> Check constraint: assignedUserId is NULL. Lock obtido com sucesso.</div>
              <div><span className="text-emerald-500">&gt;</span> UPDATE conversation SET assignedUserId = userId, status = &apos;open&apos;;</div>
              <div><span className="text-emerald-500">&gt;</span> Transação commitada com sucesso. Evento WS emitido.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
