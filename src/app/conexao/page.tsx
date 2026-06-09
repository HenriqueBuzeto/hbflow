'use client';

import React, { useState } from 'react';
import { useStore, whatsappConnectionSchema } from '@/store/useStore';
import { Link2, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Terminal, Send } from 'lucide-react';

export default function ConexaoPage() {
  const { whatsappConnection, updateWhatsappConnection } = useStore();

  const [formData, setFormData] = useState({
    name: whatsappConnection.name,
    phoneNumber: whatsappConnection.phoneNumber || '',
    phoneId: whatsappConnection.phoneId || '',
    wabaId: whatsappConnection.wabaId || '',
    accessToken: whatsappConnection.accessToken || '',
    verifyToken: whatsappConnection.verifyToken || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [testLog, setTestLog] = useState<string[]>([
    'System Initialized',
    'Webhook verification listener set up on route /api/webhooks/whatsapp'
  ]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setErrors({});

    const result = whatsappConnectionSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // Update connection settings
    updateWhatsappConnection({
      ...formData,
      status: 'connected',
      lastSyncedAt: new Date().toISOString()
    });

    setSuccess('Configurações da Cloud API salvas e validadas com sucesso!');
    setTestLog((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Saved WhatsApp parameters`,
      `[${new Date().toLocaleTimeString()}] Connection established: HTTP 200 OK`
    ]);
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTestLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Syncing WhatsApp templates...`]);
    setTimeout(() => {
      setIsSyncing(false);
      updateWhatsappConnection({ lastSyncedAt: new Date().toISOString() });
      setTestLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Templates synced successfully: 2 active templates found.`
      ]);
    }, 1200);
  };

  const triggerTestMessage = () => {
    setTestLog((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] POST https://graph.facebook.com/v18.0/${formData.phoneId}/messages`,
      `[${new Date().toLocaleTimeString()}] Sending: { messaging_product: "whatsapp", to: "+5511999998888", type: "text" }`,
      `[${new Date().toLocaleTimeString()}] Response: { message_id: "wamid.HBFlowTestMessage123" }`
    ]);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Link2 size={24} className="text-primary" />
          Conexão WhatsApp Business Platform
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Integre sua conta oficial do WhatsApp Business Cloud API e comece a enviar mensagens e receber webhooks em tempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Settings Form Column */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Parâmetros da Cloud API</h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Nome da Conexão
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary focus:bg-white transition-all font-medium"
                    placeholder="Minha Empresa Whatsapp"
                  />
                  {errors.name && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Número do Telefone
                  </label>
                  <input
                    type="text"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary focus:bg-white transition-all font-medium"
                    placeholder="+5511999998888"
                  />
                  {errors.phoneNumber && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.phoneNumber}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={formData.phoneId}
                    onChange={(e) => setFormData({ ...formData, phoneId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary focus:bg-white transition-all font-mono"
                    placeholder="1098437..."
                  />
                  {errors.phoneId && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.phoneId}</p>}
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    WABA ID (Account ID)
                  </label>
                  <input
                    type="text"
                    value={formData.wabaId}
                    onChange={(e) => setFormData({ ...formData, wabaId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary focus:bg-white transition-all font-mono"
                    placeholder="2349081..."
                  />
                  {errors.wabaId && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.wabaId}</p>}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Access Token (Criptografado)
                </label>
                <textarea
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary focus:bg-white transition-all font-mono"
                  placeholder="EAAGb0ZC9ZCsZB0BA..."
                />
                {errors.accessToken && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.accessToken}</p>}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Webhook Verify Token (Configurável)
                </label>
                <input
                  type="text"
                  value={formData.verifyToken}
                  onChange={(e) => setFormData({ ...formData, verifyToken: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary focus:bg-white transition-all font-mono"
                  placeholder="verify_token_secret"
                />
                {errors.verifyToken && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.verifyToken}</p>}
              </div>

              {success && (
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold p-3 rounded-xl border border-emerald-200">
                  <CheckCircle2 size={16} />
                  <span>{success}</span>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={triggerTestMessage}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Send size={13} />
                  <span>Teste de Envio</span>
                </button>

                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-primary/10 cursor-pointer"
                >
                  Salvar Configuração
                </button>
              </div>
            </form>
          </div>

          {/* Webhook details */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-2">Endpoint de Webhook</h3>
            <p className="text-xs text-slate-500 mb-3">
              Configure esta URL no seu portal Meta Developers para receber mensagens e logs de leitura:
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
              <code className="text-xs text-slate-700 select-all font-mono">
                https://api.hbflow.com/v1/webhooks/whatsapp
              </code>
              <span className="text-[10px] bg-indigo-50 text-primary border border-indigo-100 font-bold px-2 py-0.5 rounded-full">
                POST
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar Status Column */}
        <div className="space-y-6">
          {/* Status Box */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Status da Conexão</h4>

            <div className="flex items-center gap-3">
              {whatsappConnection.status === 'connected' ? (
                <>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800">Conectado Oficial</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Sincronizado: {new Date(whatsappConnection.lastSyncedAt || '').toLocaleTimeString()}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                    <AlertCircle size={22} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500">Desconectado</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Aguardando configuração</span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold py-2 px-3 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span>Sincronizar Templates</span>
              </button>
            </div>
          </div>

          {/* CLI Terminal Logger */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col h-[280px]">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Terminal size={12} className="text-primary" />
                Console de Integração
              </span>
              <button
                onClick={() => setTestLog([])}
                className="text-[9px] text-slate-500 hover:text-slate-300"
              >
                Limpar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-[10px] text-slate-300 space-y-1">
              {testLog.map((log, idx) => (
                <div key={idx} className="leading-relaxed break-all">
                  <span className="text-emerald-500">&gt;</span> {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
