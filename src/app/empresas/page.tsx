'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Building2, Plus, ShieldCheck, CheckCircle2, AlertCircle, Sparkles, RefreshCw, Save, Mail, Phone, FileText } from 'lucide-react';

export default function EmpresasPage() {
  const { tenants, currentTenantId, setCurrentTenantId, fetchUsers } = useStore();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active Tenant settings form state
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantCnpj, setTenantCnpj] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [tenantPlan, setTenantPlan] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const activeTenant = tenants.find((t) => t.id === currentTenantId) || tenants[0] || { id: '', name: 'Empresa', slug: '', plan: 'starter' };

  // Formatting Masks
  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 10) {
      return digits
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .substring(0, 14);
    } else {
      return digits
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .substring(0, 15);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTenantPhone(formatPhone(e.target.value));
  };

  // Load Active Tenant Registration Details
  const loadTenantDetails = async () => {
    setIsFetching(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const res = await fetch('/api/v1/tenant');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.tenant) {
          setTenantName(data.tenant.name || '');
          setTenantEmail(data.tenant.email || '');
          setTenantPhone(data.tenant.phone ? formatPhone(data.tenant.phone) : '');
          setTenantCnpj(data.tenant.document ? formatCNPJ(data.tenant.document) : '');
          setTenantSlug(data.tenant.slug || '');
          setTenantPlan(data.tenant.plan || 'starter');
        }
      }
    } catch (err) {
      console.error('Failed to fetch tenant details:', err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (currentTenantId) {
      loadTenantDetails();
    }
  }, [currentTenantId]);

  // Update Active Tenant Action
  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess('');
    setIsSaving(true);

    try {
      const res = await fetch('/api/v1/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tenantName,
          email: tenantEmail,
          phone: tenantPhone
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess(data.message || 'Dados da empresa salvos com sucesso!');
        // Refresh active list in Zustand store
        await fetchUsers();
      } else {
        setSaveError(data.error || 'Erro ao atualizar dados da empresa.');
      }
    } catch (err) {
      console.error(err);
      setSaveError('Erro de conexão ao salvar alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    if (!name.trim() || !slug.trim()) {
      setErrorMsg('Preencha o nome e subdomínio da empresa.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/link-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Nova empresa vinculada com sucesso!');
        setName('');
        setSlug('');
        // Atualizar lista de empresas na store
        await fetchUsers();
      } else {
        setErrorMsg(data.error || 'Falha ao vincular empresa.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro de conexão ao vincular empresa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Building2 size={24} className="text-primary" />
          Gerenciar Empresas (Multi-tenancy)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Visão geral do ecossistema SaaS. Cada empresa/inquilino (Tenant) possui isolamento no banco de dados e conexões independentes do WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns: Dossier and List */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Tenant Box with Form */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-primary" />
                Dados Cadastrais da Empresa Ativa
              </h3>
              
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                tenantPlan === 'pro'
                  ? 'bg-indigo-50 border-indigo-150 text-indigo-600'
                  : 'bg-emerald-50 border-emerald-150 text-emerald-600'
              }`}>
                Plano {tenantPlan}
              </span>
            </div>

            {isFetching ? (
              <div className="flex items-center justify-center py-8 text-xs text-slate-400 gap-2">
                <RefreshCw size={14} className="animate-spin" />
                <span>Carregando dados da empresa...</span>
              </div>
            ) : (
              <form onSubmit={handleUpdateTenant} className="space-y-4 text-xs font-medium">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-450 uppercase block mb-1">Razão Social / Nome</label>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus-within:border-primary focus-within:bg-white">
                      <Building2 size={14} className="text-slate-400 mr-2 shrink-0" />
                      <input
                        type="text"
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        className="bg-transparent border-none outline-none w-full font-semibold"
                        placeholder="Nome da Empresa"
                      />
                    </div>
                  </div>

                  {/* CNPJ (Read Only) */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-450 uppercase block mb-1">CNPJ (Não editável)</label>
                    <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 cursor-not-allowed">
                      <FileText size={14} className="text-slate-400 mr-2 shrink-0" />
                      <input
                        type="text"
                        value={tenantCnpj}
                        disabled
                        className="bg-transparent border-none outline-none w-full font-mono cursor-not-allowed"
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                  </div>

                  {/* E-mail */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-450 uppercase block mb-1">E-mail Principal</label>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus-within:border-primary focus-within:bg-white">
                      <Mail size={14} className="text-slate-400 mr-2 shrink-0" />
                      <input
                        type="email"
                        value={tenantEmail}
                        onChange={(e) => setTenantEmail(e.target.value)}
                        className="bg-transparent border-none outline-none w-full font-semibold"
                        placeholder="email@empresa.com"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-450 uppercase block mb-1">Telefone de Contato</label>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus-within:border-primary focus-within:bg-white">
                      <Phone size={14} className="text-slate-400 mr-2 shrink-0" />
                      <input
                        type="text"
                        value={tenantPhone}
                        onChange={handlePhoneChange}
                        className="bg-transparent border-none outline-none w-full font-semibold"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>

                  {/* Tenant Slug ID */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-450 uppercase block mb-1">Slug de Identificação (Subdomínio)</label>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <code className="text-xs text-slate-600 font-mono select-all block">
                        https://{tenantSlug}.hbflow.com.br
                      </code>
                    </div>
                  </div>
                </div>

                {saveError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-250 text-rose-600 rounded-xl flex items-center gap-1.5 text-[10.5px]">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{saveError}</span>
                  </div>
                )}

                {saveSuccess && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-250 text-emerald-600 rounded-xl flex items-center gap-1.5 text-[10.5px]">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span>{saveSuccess}</span>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/10 hover:scale-[1.01] cursor-pointer"
                  >
                    {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Directory Box */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Empresas Vinculadas a sua Conta</h4>
            <p className="text-[11px] text-slate-400 mb-3">Clique em qualquer empresa abaixo para trocar de ambiente instantaneamente.</p>
            <div className="space-y-2.5">
              {tenants.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setCurrentTenantId(t.id)}
                  className={`p-4 border rounded-2xl flex justify-between items-center text-xs font-medium cursor-pointer transition-all ${
                    t.id === currentTenantId ? 'border-primary bg-primary/5 ring-2 ring-primary/10' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <strong className="text-slate-800 text-sm block">{t.name}</strong>
                    <span className="text-[10px] text-slate-400 mt-1 block">ID: {t.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-slate-100 border px-2.5 py-0.5 rounded-full capitalize">
                      {t.plan}
                    </span>
                    {t.id === currentTenantId && (
                      <span className="text-[9px] bg-primary text-white font-bold px-2 py-0.5 rounded-full">
                        Ativa
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Register New Tenant */}
        <div className="space-y-6">
          {/* Link New Tenant Form */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-800 border-b pb-2 flex items-center gap-1.5">
              <Plus size={14} className="text-primary" />
              Adicionar Outra Empresa
            </h4>
            
            <form onSubmit={handleLinkTenant} className="space-y-3 text-xs font-medium">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nome da Empresa</label>
                <input
                  type="text"
                  placeholder="Minha Nova Empresa Ltda"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary focus:bg-white text-slate-700"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Subdomínio / Slug</label>
                <div className="flex items-center bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs focus-within:border-primary focus-within:bg-white text-slate-700">
                  <input
                    type="text"
                    placeholder="empresa2"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="bg-transparent border-none outline-none flex-1 w-full"
                  />
                  <span className="text-slate-400 font-semibold">.hbflow.com.br</span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-250 text-rose-600 rounded-xl flex items-center gap-1.5 text-[10.5px]">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-250 text-emerald-600 rounded-xl flex items-center gap-1.5 text-[10.5px]">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-bold py-2 rounded-xl transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-1 cursor-pointer"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                <span>{loading ? 'Cadastrando...' : 'Cadastrar e Vincular'}</span>
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-800 border-b pb-2 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-primary" />
              Segurança e Conformidade
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              O banco de dados utiliza chaves de isolamento. Quando você troca de empresa, todos os cookies e tokens são regenerados. Não há qualquer cruzamento de dados entre empresas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
