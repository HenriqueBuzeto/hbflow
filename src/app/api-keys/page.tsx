'use client';

import React, { useState } from 'react';
import { Code, Key, RefreshCw, Copy, Check, Terminal, Play } from 'lucide-react';

interface ApiToken {
  id: string;
  name: string;
  token: string;
  scope: string;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([
    { id: '1', name: 'Integração Evolution API Node', token: 'hb_live_a1B2c3D4e5F6g7H8i9J0...', scope: 'all', createdAt: '2026-06-08' }
  ]);
  const [showCopied, setShowCopied] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [tokenOutput, setTokenOutput] = useState('');

  const generateToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName) return;

    const randomStr = Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('');
    const fullToken = `hb_live_${randomStr}`;

    const newKey: ApiToken = {
      id: `key-${Date.now()}`,
      name: newTokenName,
      token: `${fullToken.slice(0, 12)}...`,
      scope: 'all',
      createdAt: new Date().toISOString().split('T')[0]
    };

    setTokens([newKey, ...tokens]);
    setTokenOutput(fullToken);
    setNewTokenName('');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(tokenOutput);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Code size={24} className="text-primary" />
          Integrações de API
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Gere chaves de acesso para integrar o HBFlow a sistemas de CRM externos, ERPs, Webhooks ou automações comerciais personalizadas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token Generator Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Generator Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Key size={14} className="text-primary" />
              Chaves de Acesso API (Tokens)
            </h3>

            <form onSubmit={generateToken} className="flex gap-2 items-end mb-5 text-xs font-semibold">
              <div className="flex-1">
                <label className="text-[10px] text-slate-500 uppercase block mb-1">Identificador do Token</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ERP Integrador de Leads"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none focus:border-primary focus:bg-white transition-all"
                />
              </div>
              <button
                type="submit"
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2 px-4 rounded-xl transition-all shadow-md shadow-primary/10 cursor-pointer flex items-center gap-1 shrink-0 h-[34px]"
              >
                <RefreshCw size={12} />
                <span>Gerar Token</span>
              </button>
            </form>

            {/* Generated Token output box */}
            {tokenOutput && (
              <div className="bg-slate-50 border border-indigo-100 rounded-2xl p-4 mb-5 flex flex-col gap-2 relative border-dashed">
                <span className="text-[9px] uppercase font-bold text-slate-400">Token gerado com sucesso:</span>
                <div className="flex justify-between items-center gap-4">
                  <code className="text-xs text-slate-700 font-mono select-all break-all pr-12">
                    {tokenOutput}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="p-2 hover:bg-slate-200 rounded-xl transition-colors shrink-0 absolute right-3 top-8"
                  >
                    {showCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-500" />}
                  </button>
                </div>
                <p className="text-[10px] text-amber-600 font-bold mt-1">
                  *Atenção: Guarde este token. Por motivos de segurança, ele não será exibido novamente após fechar esta janela.
                </p>
              </div>
            )}

            {/* Token Table */}
            <div className="overflow-x-auto border rounded-2xl">
              <table className="w-full text-left text-xs divide-y">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] font-bold">
                  <tr>
                    <th className="px-4 py-3">Identificador</th>
                    <th className="px-4 py-3">Token</th>
                    <th className="px-4 py-3">Escopo</th>
                    <th className="px-4 py-3 text-right">Data de Criação</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-medium text-slate-700">
                  {tokens.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold">{t.name}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{t.token}</td>
                      <td className="px-4 py-3">
                        <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-600 capitalize">
                          {t.scope}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[10px] text-slate-400">{t.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Webhook API Console */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm h-[320px] flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-3 border-b border-slate-800 pb-2 flex items-center gap-1">
              <Terminal size={12} className="text-primary" />
              JSON Webhook Payload Emulator
            </span>
            <div className="flex-1 overflow-y-auto font-mono text-[10px] text-slate-300 space-y-1">
              <div><span className="text-emerald-500">&gt;</span> dispatchWebhookEvent(&quot;message_received&quot;):</div>
              <pre className="text-slate-400 text-[9px] leading-relaxed bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 overflow-x-auto mt-2">
{`{
  "event": "messages.upsert",
  "instance": "hbflow_official",
  "data": {
    "key": {
      "remoteJid": "5511999998888@s.whatsapp.net",
      "fromMe": false,
      "id": "wamid.HBFlowTest123"
    },
    "message": {
      "conversation": "Olá, quanto custa?"
    },
    "messageTimestamp": 1780829819
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
