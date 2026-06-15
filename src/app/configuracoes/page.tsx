'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  Clock, 
  Building, 
  Brain, 
  Lock, 
  Webhook, 
  UserCheck, 
  Loader2, 
  Check, 
  AlertCircle,
  AlertTriangle,
  Globe,
  HelpCircle,
  Info
} from 'lucide-react';
import { useStore } from '@/store/useStore';

type SettingsTab = 'general' | 'routing' | 'hours' | 'sla' | 'ai' | 'security';

export default function ConfigsPage() {
  const { departments } = useStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // 1. General & Branding Settings
  const [brandingName, setBrandingName] = useState('HBFlow Workspace');
  const [defaultLanguage, setDefaultLanguage] = useState('pt_BR');
  const [defaultTimezone, setDefaultTimezone] = useState('America/Sao_Paulo');

  // 2. Attendance & Routing Settings
  const [routingMode, setRoutingMode] = useState('round_robin');
  const [maxWorkload, setMaxWorkload] = useState(10);
  const [enableQueueOverflow, setEnableQueueOverflow] = useState(false);
  const [overflowThresholdMinutes, setOverflowThresholdMinutes] = useState(10);
  const [enableAutoClose, setEnableAutoClose] = useState(false);
  const [autoCloseInactivityHours, setAutoCloseInactivityHours] = useState(24);

  // 3. Signature configuration
  const [allowSig, setAllowSig] = useState(true);
  const [sigPos, setSigPos] = useState<'end' | 'start'>('end');

  // 4. Business Hours (Expediente Comercial)
  const [workdays, setWorkdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startHour, setStartHour] = useState('08:00');
  const [endHour, setEndHour] = useState('18:00');
  const [outOfOfficeMessage, setOutOfOfficeMessage] = useState('Olá! Nosso horário de atendimento é de segunda a sexta, das 08:00 às 18:00. Retornaremos o seu contato assim que possível.');

  // 5. SLA Settings
  const [firstResponseSlaMinutes, setFirstResponseSlaMinutes] = useState(15);
  const [subsequentSlaMinutes, setSubsequentSlaMinutes] = useState(15);
  const [totalResolutionSlaMinutes, setTotalResolutionSlaMinutes] = useState(120);

  // 6. AI & Bot Behavior
  const [enableAiTriage, setEnableAiTriage] = useState(false);
  const [aiTimeoutMinutes, setAiTimeoutMinutes] = useState(5);
  const [aiTone, setAiTone] = useState('friendly');

  // 7. Integrations & Security
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookToken, setWebhookToken] = useState('');
  const [forceMfa, setForceMfa] = useState(false);
  const [restrictExportToAdmins, setRestrictExportToAdmins] = useState(true);
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState(8);

  // Fetch settings from API
  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/v1/settings');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar as configurações');
      }

      if (data.settings) {
        const settings = data.settings;
        setBrandingName(settings.brandingName || 'HBFlow Workspace');
        setDefaultLanguage(settings.defaultLanguage || 'pt_BR');
        setDefaultTimezone(settings.defaultTimezone || 'America/Sao_Paulo');

        // Parse business hours
        if (settings.businessHoursJson) {
          const hours = JSON.parse(settings.businessHoursJson);
          if (hours.workdays) setWorkdays(hours.workdays);
          if (hours.startHour) setStartHour(hours.startHour);
          if (hours.endHour) setEndHour(hours.endHour);
          if (hours.outOfOfficeMessage) setOutOfOfficeMessage(hours.outOfOfficeMessage);
        }

        // Parse global settings JSON
        if (settings.settingsJson) {
          const cfg = JSON.parse(settings.settingsJson);
          if (cfg.allowSignature !== undefined) setAllowSig(cfg.allowSignature);
          if (cfg.signaturePosition !== undefined) setSigPos(cfg.signaturePosition);
          if (cfg.firstResponseSlaMinutes !== undefined) setFirstResponseSlaMinutes(cfg.firstResponseSlaMinutes);
          if (cfg.subsequentSlaMinutes !== undefined) setSubsequentSlaMinutes(cfg.subsequentSlaMinutes);
          if (cfg.totalResolutionSlaMinutes !== undefined) setTotalResolutionSlaMinutes(cfg.totalResolutionSlaMinutes);
          if (cfg.maxWorkload !== undefined) setMaxWorkload(cfg.maxWorkload);
          if (cfg.routingMode !== undefined) setRoutingMode(cfg.routingMode);
          if (cfg.enableQueueOverflow !== undefined) setEnableQueueOverflow(cfg.enableQueueOverflow);
          if (cfg.overflowThresholdMinutes !== undefined) setOverflowThresholdMinutes(cfg.overflowThresholdMinutes);
          if (cfg.enableAutoClose !== undefined) setEnableAutoClose(cfg.enableAutoClose);
          if (cfg.autoCloseInactivityHours !== undefined) setAutoCloseInactivityHours(cfg.autoCloseInactivityHours);
          if (cfg.enableAiTriage !== undefined) setEnableAiTriage(cfg.enableAiTriage);
          if (cfg.aiTimeoutMinutes !== undefined) setAiTimeoutMinutes(cfg.aiTimeoutMinutes);
          if (cfg.aiTone !== undefined) setAiTone(cfg.aiTone);
          if (cfg.webhookUrl !== undefined) setWebhookUrl(cfg.webhookUrl);
          if (cfg.webhookToken !== undefined) setWebhookToken(cfg.webhookToken);
          if (cfg.forceMfa !== undefined) setForceMfa(cfg.forceMfa);
          if (cfg.restrictExportToAdmins !== undefined) setRestrictExportToAdmins(cfg.restrictExportToAdmins);
          if (cfg.sessionTimeoutHours !== undefined) setSessionTimeoutHours(cfg.sessionTimeoutHours);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar configurações globais.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Submit settings to API
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const businessHoursJson = JSON.stringify({
        timezone: defaultTimezone,
        workdays,
        startHour,
        endHour,
        outOfOfficeMessage
      });

      const settingsJson = JSON.stringify({
        allowSignature: allowSig,
        signaturePosition: sigPos,
        firstResponseSlaMinutes,
        subsequentSlaMinutes,
        totalResolutionSlaMinutes,
        maxWorkload,
        routingMode,
        enableQueueOverflow,
        overflowThresholdMinutes,
        enableAutoClose,
        autoCloseInactivityHours,
        enableAiTriage,
        aiTimeoutMinutes,
        aiTone,
        webhookUrl,
        webhookToken,
        forceMfa,
        restrictExportToAdmins,
        sessionTimeoutHours
      });

      const payload = {
        brandingName,
        defaultLanguage,
        defaultTimezone,
        businessHoursJson,
        settingsJson
      };

      const response = await fetch('/api/v1/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar as configurações.');
      }

      setSuccess('Configurações salvas e aplicadas em tempo real com sucesso!');
      setTimeout(() => setSuccess(''), 3500);
      loadSettings(); // Reload
    } catch (err: any) {
      setError(err.message || 'Erro de rede ao salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleDayToggle = (day: number) => {
    if (workdays.includes(day)) {
      setWorkdays(workdays.filter((d) => d !== day));
    } else {
      setWorkdays([...workdays, day].sort());
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings size={24} className="text-primary" />
            Configurações do Sistema
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure parâmetros operacionais do Workspace. Ajuste regras de roteamento, expediente, SLAs e políticas de IA.
          </p>
        </div>
        {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
      </div>

      {/* Alert Banners */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <Check size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Settings Panel Wrapper */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        
        {/* Navigation Sidebar inside Panel */}
        <aside className="w-full md:w-64 border-r border-slate-200 bg-slate-50/40 p-4 flex flex-col justify-between shrink-0">
          <nav className="space-y-1 text-xs font-bold text-slate-500">
            
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all text-left ${
                activeTab === 'general' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <Building size={16} />
              <span>Dados & Geral</span>
            </button>

            <button
              onClick={() => setActiveTab('routing')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all text-left ${
                activeTab === 'routing' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <UserCheck size={16} />
              <span>Roteamento de Fila</span>
            </button>

            <button
              onClick={() => setActiveTab('hours')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all text-left ${
                activeTab === 'hours' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <Clock size={16} />
              <span>Expediente Comercial</span>
            </button>

            <button
              onClick={() => setActiveTab('sla')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all text-left ${
                activeTab === 'sla' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <AlertTriangle size={16} />
              <span>Métricas de SLA</span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all text-left ${
                activeTab === 'ai' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <Brain size={16} />
              <span>Comportamento de IA</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all text-left ${
                activeTab === 'security' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <Lock size={16} />
              <span>Segurança & APIs</span>
            </button>

          </nav>
          
          <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-[10px] text-slate-400 font-medium leading-relaxed mt-6">
            <span className="font-bold block mb-1 text-slate-600 flex items-center gap-1">
              <Lock size={12} className="text-primary" /> Auditoria Geral
            </span>
            Toda alteração de configuração é auditada e registrada na trilha de governança da empresa.
          </div>
        </aside>

        {/* Dynamic Fields Area */}
        <form onSubmit={handleSave} className="flex-1 p-6 md:p-8 flex flex-col justify-between text-xs font-semibold text-slate-700">
          
          {/* TAB CONTENT PANEL */}
          <div className="space-y-6">
            
            {/* 1. GENERAL TAB */}
            {activeTab === 'general' && (
              <div className="space-y-5">
                <div className="border-b pb-2 flex items-center gap-2 text-slate-800">
                  <Building size={16} className="text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Identidade do Workspace</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Nome do Branding / Workspace</label>
                    <input
                      type="text"
                      value={brandingName}
                      onChange={(e) => setBrandingName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/25 outline-none transition-all font-medium text-slate-800"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block flex items-center gap-1"><Globe size={11} /> Idioma Padrão</label>
                    <select
                      value={defaultLanguage}
                      onChange={(e) => setDefaultLanguage(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:border-primary focus:bg-white outline-none cursor-pointer font-bold text-slate-800"
                    >
                      <option value="pt_BR">Português (Brasil)</option>
                      <option value="en_US">Inglês (Estados Unidos)</option>
                      <option value="es_ES">Espanhol (Espanha)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Fuso Horário Padrão</label>
                    <select
                      value={defaultTimezone}
                      onChange={(e) => setDefaultTimezone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:border-primary focus:bg-white outline-none cursor-pointer font-bold text-slate-800"
                    >
                      <option value="America/Sao_Paulo">America/Sao_Paulo (UTC -3, Horário de Brasília)</option>
                      <option value="America/Manaus">America/Manaus (UTC -4)</option>
                      <option value="America/Recife">America/Recife (UTC -3)</option>
                      <option value="Europe/London">Europe/London (UTC +0)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3.5 border-t pt-5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Política de Assinaturas</span>
                  <div className="flex items-center justify-between bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                    <div>
                      <span className="block text-slate-800 font-bold text-xs">Ativar Assinatura dos Atendentes</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-normal">Força o envio da assinatura nas respostas de WhatsApp</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowSig}
                      onChange={(e) => setAllowSig(e.target.checked)}
                      className="w-4 h-4 text-primary accent-primary cursor-pointer rounded"
                    />
                  </div>

                  {allowSig && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Posição Padrão da Assinatura</label>
                      <select
                        value={sigPos}
                        onChange={(e) => setSigPos(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 focus:border-primary focus:bg-white outline-none cursor-pointer font-bold text-slate-800"
                      >
                        <option value="end">No final da mensagem</option>
                        <option value="start">No início da mensagem</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. ROUTING TAB */}
            {activeTab === 'routing' && (
              <div className="space-y-5">
                <div className="border-b pb-2 flex items-center gap-2 text-slate-800">
                  <UserCheck size={16} className="text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Políticas de Distribuição & Fila</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Modo de Roteamento de Chats</label>
                    <select
                      value={routingMode}
                      onChange={(e) => setRoutingMode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:border-primary focus:bg-white outline-none cursor-pointer font-bold text-slate-800"
                    >
                      <option value="round_robin">Round-Robin (Distribuição Rotativa)</option>
                      <option value="workload">Menor Carga (Atendente mais ocioso)</option>
                      <option value="manual">Manual (Sem direcionamento automático)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Carga Máxima de Atendente (chats simultâneos)</label>
                    <input
                      type="number"
                      value={maxWorkload}
                      onChange={(e) => setMaxWorkload(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:border-primary focus:bg-white outline-none transition-all font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* Queue Overflow */}
                <div className="space-y-4 border-t pt-5">
                  <div className="flex items-center justify-between bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                    <div>
                      <span className="block text-slate-800 font-bold text-xs">Ativar Transbordo de Chamados</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-normal">Transfere chats automaticamente em caso de longa espera na fila de triagem</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableQueueOverflow}
                      onChange={(e) => setEnableQueueOverflow(e.target.checked)}
                      className="w-4 h-4 text-primary accent-primary cursor-pointer rounded"
                    />
                  </div>

                  {enableQueueOverflow && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border border-dashed rounded-2xl animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Tempo Máximo para Estourar o Limite (min)</label>
                        <input
                          type="number"
                          value={overflowThresholdMinutes}
                          onChange={(e) => setOverflowThresholdMinutes(parseInt(e.target.value) || 5)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none font-mono font-bold text-slate-800"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Direcionar para o Setor Auxiliar</label>
                        <select
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none font-bold text-slate-800"
                        >
                          <option value="">Fila Geral (Sem setor)</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Auto Close Policy */}
                <div className="space-y-4 border-t pt-5">
                  <div className="flex items-center justify-between bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                    <div>
                      <span className="block text-slate-800 font-bold text-xs">Encerrar Chats Inativos</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-normal">Fecha atendimentos em andamento caso o cliente fique sem interagir por muito tempo</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableAutoClose}
                      onChange={(e) => setEnableAutoClose(e.target.checked)}
                      className="w-4 h-4 text-primary accent-primary cursor-pointer rounded"
                    />
                  </div>

                  {enableAutoClose && (
                    <div className="space-y-1.5 p-4 border border-dashed rounded-2xl animate-in fade-in duration-200">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Tempo de Inatividade para Fechar (horas)</label>
                      <input
                        type="number"
                        value={autoCloseInactivityHours}
                        onChange={(e) => setAutoCloseInactivityHours(parseInt(e.target.value) || 24)}
                        className="max-w-[150px] bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none font-mono font-bold text-slate-800"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. BUSINESS HOURS TAB */}
            {activeTab === 'hours' && (
              <div className="space-y-5">
                <div className="border-b pb-2 flex items-center gap-2 text-slate-800">
                  <Clock size={16} className="text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Horário de Atendimento Comercial</h3>
                </div>

                {/* Weekdays selection */}
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Dias de Atendimento</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayName, idx) => {
                      const isActive = workdays.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleDayToggle(idx)}
                          className={`px-3 py-1.5 rounded-xl border text-[10px] font-black transition-all ${
                            isActive 
                              ? 'bg-primary/10 border-primary text-primary' 
                              : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-650'
                          }`}
                        >
                          {dayName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Operational Hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Horário de Abertura</label>
                    <input
                      type="time"
                      value={startHour}
                      onChange={(e) => setStartHour(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none font-mono font-bold text-slate-800 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Horário de Encerramento</label>
                    <input
                      type="time"
                      value={endHour}
                      onChange={(e) => setEndHour(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none font-mono font-bold text-slate-800 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Away message */}
                <div className="space-y-1.5 border-t pt-5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Mensagem de Ausência Automática</label>
                  <textarea
                    rows={4}
                    value={outOfOfficeMessage}
                    onChange={(e) => setOutOfOfficeMessage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:border-primary focus:bg-white outline-none font-medium leading-relaxed text-slate-800 resize-none"
                    placeholder="Escreva a mensagem padrão para clientes fora do expediente..."
                  />
                </div>
              </div>
            )}

            {/* 4. SLA TAB */}
            {activeTab === 'sla' && (
              <div className="space-y-5">
                <div className="border-b pb-2 flex items-center gap-2 text-slate-800">
                  <AlertTriangle size={16} className="text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Políticas de SLA Departamentais</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Primeira Resposta (TME Máx - min)</label>
                    <input
                      type="number"
                      value={firstResponseSlaMinutes}
                      onChange={(e) => setFirstResponseSlaMinutes(parseInt(e.target.value) || 5)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none font-mono font-bold text-slate-800"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Interação Subsequente (min)</label>
                    <input
                      type="number"
                      value={subsequentSlaMinutes}
                      onChange={(e) => setSubsequentSlaMinutes(parseInt(e.target.value) || 5)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Resolução Total do Chamado (min)</label>
                    <input
                      type="number"
                      value={totalResolutionSlaMinutes}
                      onChange={(e) => setTotalResolutionSlaMinutes(parseInt(e.target.value) || 30)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-2xl flex items-start gap-3">
                  <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-amber-800 font-medium leading-relaxed">
                    <span className="font-bold block mb-0.5">Como funcionam as regras de SLA?</span>
                    Estes valores servem de diretriz geral para os departamentos. Sempre que um chat estiver ativo e a resposta pendente do atendente ultrapassar o tempo configurado, um alerta de emergência visual será exibido no painel do operador e notificações de escalabilidade de prioridade serão disparadas.
                  </div>
                </div>
              </div>
            )}

            {/* 5. AI TAB */}
            {activeTab === 'ai' && (
              <div className="space-y-5">
                <div className="border-b pb-2 flex items-center gap-2 text-slate-800">
                  <Brain size={16} className="text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Inteligência Artificial & Agentes IA</h3>
                </div>

                <div className="flex items-center justify-between bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                  <div>
                    <span className="block text-slate-800 font-bold text-xs">Ativar IA de Triagem</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-normal">Permite que o Agente de IA responda e classifique clientes de forma inicial</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableAiTriage}
                    onChange={(e) => setEnableAiTriage(e.target.checked)}
                    className="w-4 h-4 text-primary accent-primary cursor-pointer rounded"
                  />
                </div>

                {enableAiTriage && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border border-dashed rounded-2xl animate-in fade-in duration-200">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Inatividade para IA assumir (min)</label>
                      <input
                        type="number"
                        value={aiTimeoutMinutes}
                        onChange={(e) => setAiTimeoutMinutes(parseInt(e.target.value) || 5)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none font-mono font-bold text-slate-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Tom de Voz da IA</label>
                      <select
                        value={aiTone}
                        onChange={(e) => setAiTone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none font-bold text-slate-800"
                      >
                        <option value="friendly">Amigável e Solícito (Suporte Padrão)</option>
                        <option value="formal">Formal e Polido (Corporativo)</option>
                        <option value="technical">Técnico e Preciso (Engenharia/TI)</option>
                        <option value="direct">Direto e Objetivo (Vendas Rápidas)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. SECURITY & DEVELOPER TAB */}
            {activeTab === 'security' && (
              <div className="space-y-5">
                <div className="border-b pb-2 flex items-center gap-2 text-slate-800">
                  <Lock size={16} className="text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Políticas de Segurança e Integrações</h3>
                </div>

                {/* MFA and restrictions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                    <div>
                      <span className="block text-slate-800 font-bold text-xs">Exigir Autenticação Multifator (MFA)</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-normal">Força todos os operadores e supervisores a ativarem 2FA no login</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={forceMfa}
                      onChange={(e) => setForceMfa(e.target.checked)}
                      className="w-4 h-4 text-primary accent-primary cursor-pointer rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                    <div>
                      <span className="block text-slate-800 font-bold text-xs">Restringir Exportação de Contatos</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-normal">Permite a exportação da base de dados de contatos apenas para perfil Admin</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={restrictExportToAdmins}
                      onChange={(e) => setRestrictExportToAdmins(e.target.checked)}
                      className="w-4 h-4 text-primary accent-primary cursor-pointer rounded"
                    />
                  </div>
                </div>

                {/* Session duration */}
                <div className="space-y-1.5 border-t pt-5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Expiração de Sessão Inativa (horas)</label>
                  <input
                    type="number"
                    value={sessionTimeoutHours}
                    onChange={(e) => setSessionTimeoutHours(parseInt(e.target.value) || 8)}
                    className="max-w-[150px] bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none font-mono font-bold text-slate-800"
                  />
                </div>

                {/* Webhooks integration */}
                <div className="space-y-4 border-t pt-5">
                  <div className="flex items-center gap-1.5">
                    <Webhook size={14} className="text-primary" />
                    <span className="text-[10px] text-slate-450 uppercase tracking-wider block">Webhook de Eventos (Integrações Externas)</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">URL de Destino do Webhook</label>
                      <input
                        type="url"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://seu-sistema.com/api/webhook"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none font-mono font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-primary transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Chave / Token de Autenticação Bearer</label>
                      <input
                        type="password"
                        value={webhookToken}
                        onChange={(e) => setWebhookToken(e.target.value)}
                        placeholder="Sua chave secreta para assinar as requisições"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none font-mono font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Form footer panel: Save button */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-8 shrink-0">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary hover:bg-primary-hover text-white text-xs font-black px-6 py-2.5 rounded-xl transition-all shadow-md shadow-primary/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Salvando políticas...
                </>
              ) : (
                <>
                  <Save size={13} />
                  Salvar Configurações Globais
                </>
              )}
            </button>
          </div>

        </form>

      </div>

    </div>
  );
}
