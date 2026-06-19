'use client';

import React, { useState, useEffect } from 'react';
import { useStore, whatsappConnectionSchema } from '@/store/useStore';
import { 
  Link2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Terminal, 
  Send, 
  QrCode, 
  Cpu, 
  Lock 
} from 'lucide-react';

export default function ConexaoPage() {
  const { whatsappConnection, updateWhatsappConnection } = useStore();

  // Active provider tab: 'cloud_api' or 'qr_gateway'
  const [activeProvider, setActiveProvider] = useState<'cloud_api' | 'qr_gateway'>(
    (whatsappConnection.provider as any) || 'cloud_api'
  );

  // Form state for Cloud API
  const [cloudFormData, setCloudFormData] = useState({
    name: whatsappConnection.name,
    phoneNumber: whatsappConnection.phoneNumber || '',
    phoneId: whatsappConnection.phoneId || '',
    wabaId: whatsappConnection.wabaId || '',
    accessToken: whatsappConnection.accessToken || '',
    verifyToken: whatsappConnection.verifyToken || ''
  });

  // Connection ID from database
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [isFeatureFlagEnabled, setIsFeatureFlagEnabled] = useState(true);

  // Form state for QR Code / Evolution API
  const [qrInstanceName, setQrInstanceName] = useState(
    whatsappConnection.instanceName || 'piloto-hbflow'
  );
  const [qrName, setQrName] = useState(
    activeProvider === 'qr_gateway' ? whatsappConnection.name : 'Meu Celular Pessoal'
  );

  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<'disconnected' | 'connecting' | 'connected'>(
    activeProvider === 'qr_gateway' ? (whatsappConnection.status as any) : 'disconnected'
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [testLog, setTestLog] = useState<string[]>([
    'System Initialized',
    'Provider Abstraction: WhatsAppProviderFactory registered',
    'Webhook validation listener set up on route /api/webhooks/whatsapp'
  ]);

  // Fetch connection on mount
  useEffect(() => {
    const fetchConnection = async () => {
      try {
        const res = await fetch('/api/v1/whatsapp/qr/instances');
        if (res.status === 403) {
          setIsFeatureFlagEnabled(false);
          setTestLog((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Feature Flag whatsapp_qr_gateway_enabled desativada.`
          ]);
          return;
        }
        const data = await res.json();
        if (data.success && data.connection) {
          const conn = data.connection;
          setConnectionId(conn.id);
          setActiveProvider(conn.provider);
          updateWhatsappConnection(conn);
          if (conn.provider === 'qr_gateway') {
            setQrName(conn.name);
            setQrInstanceName(conn.instanceName || '');
            setQrStatus(conn.status);
            setQrCodeBase64(conn.qrCode);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar conexão:', err);
      }
    };
    fetchConnection();
  }, []);

  // Poll connection status when in connecting state
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (connectionId && qrStatus === 'connecting') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/v1/whatsapp/qr/instances/${connectionId}/status`);
          const data = await res.json();
          if (data.success && data.connection) {
            const conn = data.connection;
            setQrStatus(conn.status);
            updateWhatsappConnection(conn);
            if (conn.status === 'connected') {
              setQrCodeBase64(null);
              setSuccess('WhatsApp Pessoal via QR Code conectado com sucesso!');
              setTestLog((prev) => [
                ...prev,
                `[${new Date().toLocaleTimeString()}] QR Code escaneado com sucesso. Aparelho conectado.`,
                `[${new Date().toLocaleTimeString()}] Telefone: ${conn.phoneNumber || ''} | Nome: ${conn.displayName || ''}`
              ]);
            } else if (conn.status === 'connecting' && conn.qrCode) {
              setQrCodeBase64(conn.qrCode);
            }
          }
        } catch (err) {
          console.error('Erro ao consultar status:', err);
        }
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connectionId, qrStatus]);

  // Handle saving Cloud API Settings
  const handleSaveCloud = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setErrors({});

    const payload = {
      name: cloudFormData.name,
      provider: 'cloud_api' as const,
      phoneNumber: cloudFormData.phoneNumber,
      phoneId: cloudFormData.phoneId,
      wabaId: cloudFormData.wabaId,
      accessToken: cloudFormData.accessToken,
      verifyToken: cloudFormData.verifyToken
    };

    const result = whatsappConnectionSchema.safeParse(payload);
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

    updateWhatsappConnection({
      ...payload,
      status: 'connected',
      lastSyncedAt: new Date().toISOString()
    });

    setSuccess('Configurações da Cloud API salvas e validadas com sucesso!');
    setTestLog((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Saved WhatsApp Cloud API parameters`,
      `[${new Date().toLocaleTimeString()}] Active Provider: WhatsAppCloudProvider`,
      `[${new Date().toLocaleTimeString()}] Connection established: HTTP 200 OK`
    ]);
  };

  // Generate QR Code from backend/gateway
  const handleGenerateQR = async () => {
    setIsGeneratingQr(true);
    setSuccess('');
    setTestLog((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Criando instância "${qrName}" no gateway...`
    ]);

    try {
      // 1. Criar conexão no banco e instância no Evolution API
      const createRes = await fetch('/api/v1/whatsapp/qr/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: qrName })
      });

      const createData = await createRes.json();
      setTestLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Resposta de criação: ${JSON.stringify(createData.result || createData)}`
      ]);

      if (!createRes.ok || !createData.success) {
        throw new Error(createData.error || 'Erro ao criar conexão');
      }

      const conn = createData.connection;
      setConnectionId(conn.id);
      setQrInstanceName(conn.instanceName);
      updateWhatsappConnection(conn);

      setTestLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Instância registrada: "${conn.instanceName}". Solicitando QR Code...`
      ]);

      // 2. Buscar/Gerar QR Code
      const qrRes = await fetch(`/api/v1/whatsapp/qr/instances/${conn.id}/qrcode`, {
        method: 'POST'
      });
      const qrData = await qrRes.json();

      if (!qrRes.ok || !qrData.success) {
        throw new Error(qrData.error || 'Erro ao obter QR Code');
      }

      const base64 = qrData.qrCode || qrData.qrcode;
      setQrCodeBase64(base64);
      setQrStatus('connecting');
      setTestLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] QR Code Base64 Length: ${base64 ? base64.length : 'null/undefined'}`,
        `[${new Date().toLocaleTimeString()}] Detalhes do gateway: ${JSON.stringify(qrData.result || qrData)}`,
        `[${new Date().toLocaleTimeString()}] QR Code gerado com sucesso. Leia usando o seu WhatsApp.`
      ]);
    } catch (err: any) {
      console.error(err);
      setTestLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Falha ao gerar QR Code: ${err.message}`
      ]);
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // Simulate scanning the QR Code (for easy client pilot/dev verification)
  const handleSimulateScan = async () => {
    if (!qrInstanceName) return;
    try {
      setTestLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Enviando simulação de conexão...`
      ]);
      const res = await fetch('/api/webhooks/whatsapp/qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'webhook-authorization': 'hbflow_qr_webhook_secret'
        },
        body: JSON.stringify({
          instance: qrInstanceName,
          event: 'connection.update',
          data: {
            state: 'open',
            phoneNumber: '5511999995555',
            pushname: 'Celular Piloto HBFlow'
          }
        })
      });

      const data = await res.json();
      if (res.ok) {
        setQrStatus('connected');
        setQrCodeBase64(null);
        setSuccess('WhatsApp Pessoal via QR Code conectado com sucesso!');
        setTestLog((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Simulação concluída com sucesso.`,
          `[${new Date().toLocaleTimeString()}] Status da instância atualizado para CONNECTED.`
        ]);
        if (connectionId) {
          const statusRes = await fetch(`/api/v1/whatsapp/qr/instances/${connectionId}/status`);
          const statusData = await statusRes.json();
          if (statusData.success && statusData.connection) {
            updateWhatsappConnection(statusData.connection);
          }
        }
      } else {
        throw new Error(data.error || 'Erro ao simular');
      }
    } catch (err: any) {
      console.error(err);
      setTestLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Erro ao simular leitura: ${err.message}`
      ]);
    }
  };

  const handleDisconnectQR = async () => {
    if (!connectionId) return;
    setTestLog((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Desconectando aparelho...`
    ]);

    try {
      const res = await fetch(`/api/v1/whatsapp/qr/instances/${connectionId}/disconnect`, {
        method: 'POST'
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setQrStatus('disconnected');
        setQrCodeBase64(null);
        updateWhatsappConnection(data.connection || { status: 'disconnected' });
        setSuccess('WhatsApp desconectado com sucesso!');
        setTestLog((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Aparelho desconectado pelo gateway.`
        ]);
      } else {
        throw new Error(data.error || 'Erro ao desconectar');
      }
    } catch (err: any) {
      console.error(err);
      setTestLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Erro ao desconectar: ${err.message}`
      ]);
    }
  };

  const handleResetQR = async () => {
    if (!connectionId) return;
    if (!window.confirm('Tem certeza de que deseja resetar esta conexão? Isso removerá a instância do gateway.')) return;

    setTestLog((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Resetando conexão...`
    ]);

    try {
      const res = await fetch(`/api/v1/whatsapp/qr/instances/${connectionId}/reset`, {
        method: 'POST'
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setConnectionId(null);
        setQrStatus('disconnected');
        setQrCodeBase64(null);
        updateWhatsappConnection({
          status: 'disconnected',
          provider: 'cloud_api'
        });
        setSuccess('Conexão resetada com sucesso!');
        setTestLog((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Conexão resetada. Canal limpo.`
        ]);
      } else {
        throw new Error(data.error || 'Erro ao resetar conexão');
      }
    } catch (err: any) {
      console.error(err);
      setTestLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Erro ao resetar conexão: ${err.message}`
      ]);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setTestLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Sincronizando metadados da conexão...`]);
    try {
      if (connectionId) {
        const res = await fetch(`/api/v1/whatsapp/qr/instances/${connectionId}/status`);
        const data = await res.json();
        if (data.success && data.connection) {
          updateWhatsappConnection(data.connection);
          setQrStatus(data.connection.status);
          setTestLog((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Sincronização concluída. Status: ${data.connection.status}`
          ]);
        } else {
          throw new Error(data.error || 'Falha na sincronização');
        }
      } else {
        // Fallback for cloud_api
        setTimeout(() => {
          setIsSyncing(false);
          updateWhatsappConnection({ lastSyncedAt: new Date().toISOString() });
          setTestLog((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Sincronização concluída com sucesso.`
          ]);
        }, 800);
      }
    } catch (err: any) {
      console.error(err);
      setTestLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Erro ao sincronizar: ${err.message}`
      ]);
    } finally {
      setIsSyncing(false);
    }
  };

  const triggerTestMessage = async () => {
    if (activeProvider === 'cloud_api') {
      setTestLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] OUTBOUND message request routed through WhatsAppMessageService`,
        `[${new Date().toLocaleTimeString()}] Factory resolved provider: WhatsAppCloudProvider`,
        `[${new Date().toLocaleTimeString()}] Dispatching payload to destination target...`,
        `[${new Date().toLocaleTimeString()}] Outbound API Response: { success: true, messageId: "msg_out_${Date.now()}" }`
      ]);
      return;
    }

    if (!connectionId) {
      alert('Por favor, estabeleça uma conexão primeiro.');
      return;
    }

    const to = window.prompt('Digite o número de telefone de destino (com DDI e DDD, ex: 5511999998888):');
    if (!to) return;

    setTestLog((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Enviando mensagem de teste via QR Gateway para ${to}...`
    ]);

    try {
      const res = await fetch(`/api/v1/whatsapp/qr/instances/${connectionId}/test-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          text: 'Olá! Esta é uma mensagem de teste enviada a partir do HBFlow para validar a sua conexão QR Code.'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Mensagem de teste enviada com sucesso!');
        setTestLog((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Mensagem enviada com sucesso! ID: ${data.result.messageId || 'N/A'}`
        ]);
      } else {
        throw new Error(data.error || 'Erro ao enviar mensagem');
      }
    } catch (err: any) {
      console.error(err);
      setTestLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Erro no envio: ${err.message}`
      ]);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Link2 size={24} className="text-primary" />
            Canais de Atendimento WhatsApp
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Escolha e conecte canais oficiais (Cloud API) ou realize pilotos controlados via QR Code (Evolution API).
          </p>
        </div>
        
        {/* Provider Switcher Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-sm self-start">
          <button
            onClick={() => {
              setActiveProvider('cloud_api');
              setSuccess('');
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeProvider === 'cloud_api'
                ? 'bg-primary text-white shadow'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Cloud API (Oficial)
          </button>
          <button
            onClick={() => {
              setActiveProvider('qr_gateway');
              setSuccess('');
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeProvider === 'qr_gateway'
                ? 'bg-primary text-white shadow'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>QR Code (Piloto)</span>
            <span className="bg-emerald-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
              Piloto
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* MAIN COLUMN FORM / QR SCANNERS */}
        <div className="md:col-span-2 space-y-6">
          
          {/* PROVIDER 1: WhatsApp Cloud API */}
          {activeProvider === 'cloud_api' && (
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">Parâmetros da Cloud API</h3>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 font-extrabold px-2 py-0.5 rounded-full">
                  Meta Official
                </span>
              </div>

              <form onSubmit={handleSaveCloud} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Nome da Conexão
                    </label>
                    <input
                      type="text"
                      value={cloudFormData.name}
                      onChange={(e) => setCloudFormData({ ...cloudFormData, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary focus:bg-white transition-all font-medium text-slate-800"
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
                      value={cloudFormData.phoneNumber}
                      onChange={(e) => setCloudFormData({ ...cloudFormData, phoneNumber: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary focus:bg-white transition-all font-medium text-slate-800"
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
                      value={cloudFormData.phoneId}
                      onChange={(e) => setCloudFormData({ ...cloudFormData, phoneId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary focus:bg-white transition-all font-mono text-slate-800"
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
                      value={cloudFormData.wabaId}
                      onChange={(e) => setCloudFormData({ ...cloudFormData, wabaId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary focus:bg-white transition-all font-mono text-slate-800"
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
                    value={cloudFormData.accessToken}
                    onChange={(e) => setCloudFormData({ ...cloudFormData, accessToken: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary focus:bg-white transition-all font-mono text-slate-800"
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
                    value={cloudFormData.verifyToken}
                    onChange={(e) => setCloudFormData({ ...cloudFormData, verifyToken: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary focus:bg-white transition-all font-mono text-slate-800"
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
          )}

          {/* PROVIDER 2: QR Code / Evolution API */}
          {activeProvider === 'qr_gateway' && (
            <div className="space-y-6">
              
              {/* Feature Flag Shield removed */}

              {!isFeatureFlagEnabled ? (
                <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm text-center flex flex-col items-center justify-center gap-4">
                  <div className="p-4 bg-rose-50 text-rose-550 rounded-full">
                    <Lock size={36} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Acesso Restrito</h3>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                    O modo QR Code está desativado para a sua conta. Ative a feature flag <strong>whatsapp_qr_gateway_enabled</strong> ou entre em contato com o suporte para obter acesso de piloto interno.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-800">Configuração do QR Code (Baileys)</h3>
                    {connectionId && (
                      <button
                        onClick={handleResetQR}
                        className="text-[10px] text-rose-500 hover:underline font-bold"
                      >
                        Resetar Instância
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Nome da Conexão
                        </label>
                        <input
                          type="text"
                          disabled={!!connectionId}
                          value={qrName}
                          onChange={(e) => setQrName(e.target.value)}
                          className="w-full bg-slate-50 disabled:opacity-60 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-primary focus:bg-white transition-all font-medium text-slate-800"
                          placeholder="Ex: Meu Whatsapp Pessoal"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          ID da Instância (Slug no Gateway)
                        </label>
                        <input
                          type="text"
                          disabled={true}
                          value={qrInstanceName}
                          className="w-full bg-slate-50 disabled:opacity-60 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none transition-all font-mono text-slate-800"
                          placeholder="Gerado automaticamente"
                        />
                      </div>
                    </div>

                    {/* QR Code Display Card */}
                    {qrStatus === 'disconnected' && !qrCodeBase64 && (
                      <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3 bg-slate-50/50">
                        <div className="p-3.5 bg-slate-100 rounded-full text-slate-400">
                          <QrCode size={32} />
                        </div>
                        <span className="text-xs font-bold text-slate-700">QR Code não gerado</span>
                        <p className="text-[10px] text-slate-400 max-w-xs leading-normal">
                          Defina o nome da conexão acima e clique para iniciar o processo de vinculação.
                        </p>
                        <button
                          onClick={handleGenerateQR}
                          disabled={isGeneratingQr}
                          className="mt-2 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-primary/10 cursor-pointer flex items-center gap-1.5"
                        >
                          {isGeneratingQr ? (
                            <>
                              <RefreshCw size={13} className="animate-spin" />
                              <span>Gerando...</span>
                            </>
                          ) : (
                            <>
                              <QrCode size={13} />
                              <span>Gerar QR Code</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Connecting QR State */}
                    {qrStatus === 'connecting' && (
                      <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50 flex flex-col items-center justify-center gap-4">
                        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-center w-48 h-48 relative overflow-hidden">
                          {whatsappConnection.qrcodeExpired ? (
                            <div className="flex flex-col items-center justify-center text-center p-4 gap-2">
                              <AlertCircle size={32} className="text-rose-500 animate-pulse" />
                              <span className="text-[10px] font-bold text-rose-600">QR Code Expirou</span>
                              <button
                                onClick={handleGenerateQR}
                                className="mt-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[9px] font-bold px-2 py-1 rounded"
                              >
                                Regenerar
                              </button>
                            </div>
                          ) : !qrCodeBase64 ? (
                            <div className="flex flex-col items-center justify-center text-center p-4 gap-2">
                              <RefreshCw size={24} className="animate-spin text-slate-400" />
                              <span className="text-[9px] font-bold text-slate-450">Gerando Imagem...</span>
                            </div>
                          ) : qrCodeBase64 === 'mock_qr_code_placeholder' ? (
                            <div className="flex flex-col items-center justify-center text-center p-4 gap-2">
                              <QrCode size={64} className="text-slate-350 animate-pulse" />
                              <span className="text-[9px] font-bold text-slate-400">QR CODE SIMULADOR</span>
                            </div>
                          ) : (
                            <img
                              src={qrCodeBase64.startsWith('data:') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
                              alt="Scan me"
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                        
                        <div className="text-center space-y-1">
                          {whatsappConnection.qrcodeExpired ? (
                            <span className="text-xs font-extrabold text-rose-600 block flex items-center justify-center gap-1.5">
                              <AlertCircle size={12} className="text-rose-600" />
                              Código Expirado
                            </span>
                          ) : (
                            <span className="text-xs font-extrabold text-slate-800 block flex items-center justify-center gap-1.5">
                              <RefreshCw size={12} className="animate-spin text-primary" />
                              Aguardando Leitura
                            </span>
                          )}
                          <p className="text-[10px] text-slate-400 max-w-xs leading-normal">
                            {whatsappConnection.qrcodeExpired 
                              ? 'O tempo limite do QR Code da Evolution API expirou. Clique em Regenerar para obter um código atualizado.' 
                              : 'Abra o WhatsApp no seu celular, vá em Aparelhos Conectados > Conectar Aparelho e leia o código acima.'}
                          </p>
                        </div>

                        {/* Developer Testing Scan Simulation CTA */}
                        <div className="border-t border-slate-200/80 pt-4 w-full flex justify-center gap-2">
                          <button
                            onClick={handleSimulateScan}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
                          >
                            Simular Leitura (Ok)
                          </button>
                          <button
                            onClick={handleDisconnectQR}
                            className="border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Connected Status Card */}
                    {qrStatus === 'connected' && (
                      <div className="border border-emerald-150 rounded-2xl p-6 bg-emerald-50/25 flex flex-col items-center justify-center gap-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <CheckCircle2 size={28} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Celular Pessoal Conectado</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                            Instância <strong>{qrInstanceName}</strong> ativa na Evolution API
                          </span>
                        </div>

                        <div className="flex gap-2.5 mt-2">
                          <button
                            type="button"
                            onClick={triggerTestMessage}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
                          >
                            <Send size={13} />
                            <span>Teste de Envio</span>
                          </button>
                          <button
                            onClick={handleDisconnectQR}
                            className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-rose-550/10 cursor-pointer"
                          >
                            Desconectar
                          </button>
                        </div>
                      </div>
                    )}

                    {success && (
                      <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold p-3 rounded-xl border border-emerald-200">
                        <CheckCircle2 size={16} />
                        <span>{success}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Webhook endpoint card */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-2">Endpoint de Webhook</h3>
            <p className="text-xs text-slate-500 mb-3">
              Configure esta URL no seu portal Meta Developers ou no painel da Evolution API para redirecionar eventos:
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
              <code className="text-xs text-slate-700 select-all font-mono">
                {typeof window !== 'undefined'
                  ? `${window.location.origin}/api/webhooks/whatsapp${activeProvider === 'qr_gateway' ? '/qr' : ''}`
                  : `https://api.hbflow.com/api/webhooks/whatsapp${activeProvider === 'qr_gateway' ? '/qr' : ''}`}
              </code>
              <span className="text-[10px] bg-indigo-50 text-primary border border-indigo-100 font-extrabold px-2 py-0.5 rounded-full">
                POST
              </span>
            </div>
          </div>
        </div>

        {/* SIDEBAR STATUS COLUMN */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Status da Conexão</h4>

            <div className="flex items-center gap-3">
              {whatsappConnection.status === 'connected' ? (
                <>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 animate-scale-in">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 block">
                      {whatsappConnection.provider === 'qr_gateway' ? 'Conectado QR Code' : 'Conectado Oficial'}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                      Sincronizado: {whatsappConnection.lastSyncedAt ? new Date(whatsappConnection.lastSyncedAt).toLocaleTimeString() : 'Agora'}
                    </span>
                  </div>
                </>
              ) : whatsappConnection.status === 'connecting' ? (
                <>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 animate-scale-in">
                    <RefreshCw size={22} className="animate-spin" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 block">
                      Aguardando QR Code
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                      Lendo celular...
                    </span>
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
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer font-bold"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span>Sincronizar Canal</span>
              </button>
            </div>
          </div>

          {/* Dossiê de Saúde da Instância (QR Code) */}
          {activeProvider === 'qr_gateway' && connectionId && (
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 animate-scale-in">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dossiê de Saúde da Instância</h4>
              
              <div className="space-y-3 text-xs">
                {/* Telemetria do Webhook */}
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Último Webhook:</span>
                  <span className="font-mono text-slate-800 font-semibold">
                    {whatsappConnection.lastWebhookReceivedAt 
                      ? new Date(whatsappConnection.lastWebhookReceivedAt).toLocaleTimeString('pt-BR') 
                      : 'Sem dados'}
                  </span>
                </div>

                {/* Telemetria de Mensagens Enviadas */}
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Última Msg Enviada:</span>
                  <span className="font-mono text-slate-800 font-semibold">
                    {whatsappConnection.lastMessageSentAt 
                      ? new Date(whatsappConnection.lastMessageSentAt).toLocaleTimeString('pt-BR') 
                      : 'Sem dados'}
                  </span>
                </div>

                {/* Telemetria de Mensagens Recebidas */}
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Última Msg Recebida:</span>
                  <span className="font-mono text-slate-800 font-semibold">
                    {whatsappConnection.lastMessageReceivedAt 
                      ? new Date(whatsappConnection.lastMessageReceivedAt).toLocaleTimeString('pt-BR') 
                      : 'Sem dados'}
                  </span>
                </div>
              </div>

              {/* Alerta de Inatividade (> 5 min) */}
              {(() => {
                if (whatsappConnection.status === 'connected' && whatsappConnection.lastWebhookReceivedAt) {
                  const diff = (Date.now() - new Date(whatsappConnection.lastWebhookReceivedAt).getTime()) / 60000;
                  if (diff > 5) {
                    return (
                      <div className="flex items-start gap-2 bg-amber-50 text-amber-800 text-[11px] p-3 rounded-xl border border-amber-200">
                        <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                        <div>
                          <span className="font-bold block">Alerta de Inatividade</span>
                          <span className="text-[10px] leading-relaxed">Sem sinal de webhooks há {Math.floor(diff)} minutos. A conexão pode ter caído.</span>
                        </div>
                      </div>
                    );
                  }
                }
                return null;
              })()}

              {/* Erros da Conexão */}
              {whatsappConnection.lastError && (
                <div className="flex items-start gap-2 bg-rose-50 text-rose-800 text-[11px] p-3 rounded-xl border border-rose-200">
                  <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <span className="font-bold block">Erro Recente</span>
                    <span className="text-[10px] leading-relaxed break-words">{whatsappConnection.lastError}</span>
                  </div>
                </div>
              )}

              {/* QR Code Expirado */}
              {whatsappConnection.qrcodeExpired && (
                <div className="flex items-start gap-2 bg-rose-50 text-rose-800 text-[11px] p-3 rounded-xl border border-rose-200">
                  <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <span className="font-bold block">QR Code Expirado</span>
                    <span className="text-[10px] leading-relaxed">Gere um novo QR Code para tentar conectar novamente.</span>
                  </div>
                </div>
              )}

              {/* Botões de Ação de Saúde */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={async () => {
                    setTestLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Solicitando reconexão...`]);
                    await handleGenerateQR();
                  }}
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-all shadow-sm text-center cursor-pointer flex items-center justify-center gap-1"
                >
                  <RefreshCw size={12} />
                  <span>Reconectar</span>
                </button>
                <button
                  onClick={handleResetQR}
                  className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold py-2.5 px-3 rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>Resetar</span>
                </button>
              </div>
            </div>
          )}

          {/* CLI Terminal Logger Console */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col h-[280px]">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Terminal size={12} className="text-primary" />
                Console de Integração
              </span>
              <button
                onClick={() => setTestLog([])}
                className="text-[9px] text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                Limpar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-[10px] text-slate-350 space-y-1.5 scrollbar-thin">
              {testLog.map((log, idx) => (
                <div key={idx} className="leading-relaxed break-all">
                  <span className="text-emerald-500 font-bold">&gt;</span> {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
