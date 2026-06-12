'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { 
  ShieldCheck, 
  HelpCircle, 
  ArrowRight, 
  ArrowLeft,
  User, 
  Building, 
  CreditCard, 
  Mail, 
  Phone, 
  Lock, 
  Copy, 
  Check, 
  Loader2, 
  Calendar 
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'real' | 'trial'>('real');

  // Real Login tab state
  const [realEmail, setRealEmail] = useState('');
  const [realPassword, setRealPassword] = useState('');
  const [realError, setRealError] = useState('');
  const [isLoggingInReal, setIsLoggingInReal] = useState(false);

  // Free Trial tab state
  const [trialName, setTrialName] = useState('');
  const [trialCompany, setTrialCompany] = useState('');
  const [trialCnpj, setTrialCnpj] = useState('');
  const [trialEmail, setTrialEmail] = useState('');
  const [trialPhone, setTrialPhone] = useState('');
  const [trialCoupon, setTrialCoupon] = useState('');
  const [trialError, setTrialError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Modal / Credentials Showbox state
  const [showModal, setShowModal] = useState(false);
  const [credentials, setCredentials] = useState<{
    loginEmail: string;
    password: string;
    trialEndsAt: string;
    companyName: string;
    userName: string;
  } | null>(null);
  const [copiedType, setCopiedType] = useState<'email' | 'password' | null>(null);
  const [isLoggingInAuto, setIsLoggingInAuto] = useState(false);

  // Input masks
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

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTrialCnpj(formatCNPJ(e.target.value));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTrialPhone(formatPhone(e.target.value));
  };

  // Handlers
  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setRealError('');
    setIsLoggingInReal(true);

    if (!realEmail || !realPassword) {
      setRealError('Por favor, preencha todos os campos.');
      setIsLoggingInReal(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: realEmail,
          password: realPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Credenciais inválidas.');
      }

      // Populate Zustand store
      const newUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        avatarUrl: data.user.avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces',
        role: 'Admin',
        signature: `Atenciosamente, ${data.user.name}`,
        sigPosition: 'disabled' as const,
        filters: ['vendas', 'financeiro', 'manutencao'],
        isOnline: true,
        presence: 'online' as const,
        workload: 0
      };

      const newTenant = {
        id: data.tenant.id,
        name: data.tenant.name,
        slug: data.tenant.slug,
        plan: data.tenant.plan || 'starter'
      };

      // Clear mock lists and disable demo mode
      useStore.getState().setDemoModeEnabled(false);
      useStore.setState({
        tenants: [newTenant],
        users: [newUser],
        currentTenantId: newTenant.id,
        currentUserId: newUser.id
      });

      router.push('/dashboard');
    } catch (err: any) {
      setRealError(err.message || 'Falha ao autenticar.');
    } finally {
      setIsLoggingInReal(false);
    }
  };

  const handleTrialRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrialError('');
    setIsRegistering(true);

    if (!trialName || !trialCompany || !trialCnpj || !trialEmail || !trialPhone) {
      setTrialError('Por favor, preencha todos os campos do cadastro.');
      setIsRegistering(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: trialName,
          companyName: trialCompany,
          cnpj: trialCnpj,
          email: trialEmail,
          phone: trialPhone,
          couponCode: trialCoupon
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha no cadastro de teste grátis.');
      }

      setCredentials(data);
      setShowModal(true);
    } catch (err: any) {
      setTrialError(err.message || 'Falha no cadastro.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCopy = (text: string, type: 'email' | 'password') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleAutoLogin = async () => {
    if (!credentials) return;
    setIsLoggingInAuto(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.loginEmail,
          password: credentials.password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao realizar login automático.');
      }

      // Populate Zustand store
      const newUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        avatarUrl: data.user.avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces',
        role: 'Admin',
        signature: `Atenciosamente, ${data.user.name}`,
        sigPosition: 'disabled' as const,
        filters: ['vendas', 'financeiro', 'manutencao'],
        isOnline: true,
        presence: 'online' as const,
        workload: 0
      };

      const newTenant = {
        id: data.tenant.id,
        name: data.tenant.name,
        slug: data.tenant.slug,
        plan: data.tenant.plan || 'starter'
      };

      // Clear mock lists and disable demo mode
      useStore.getState().setDemoModeEnabled(false);
      useStore.setState({
        tenants: [newTenant],
        users: [newUser],
        currentTenantId: newTenant.id,
        currentUserId: newUser.id
      });

      setShowModal(false);
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setTrialError(err.message || 'Erro ao acessar o sistema automaticamente.');
      setShowModal(false);
    } finally {
      setIsLoggingInAuto(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12 relative overflow-hidden always-dark">
      {/* Back to Home Button */}
      <button
        onClick={() => router.push('/')}
        className="absolute top-6 left-6 flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-950/40 hover:bg-slate-950 border border-white/5 hover:border-white/10 px-4.5 py-2.5 rounded-2xl transition-all shadow-md cursor-pointer z-20"
      >
        <ArrowLeft size={14} />
        <span>Voltar ao Site</span>
      </button>

      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md z-10">
        {/* Brand logo header */}
        <div className="text-center mb-8 flex flex-col items-center justify-center">
          <img src="/logo hbflow.png" alt="HBFlow Logo" className="h-[420px] w-auto object-contain my-[-175px] mx-[-145px] mb-[-135px]" />
          <p className="text-sm text-slate-400 mt-2">
            Gestão de WhatsApp + CRM Omnichannel Multi-tenant
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
          
          {/* Tab Navigation bar */}
          <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800/80 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('real')}
              className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'real'
                  ? 'bg-slate-800 text-white shadow-md border border-slate-700/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Acesso Real
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trial')}
              className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'trial'
                  ? 'bg-slate-800 text-white shadow-md border border-slate-700/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Teste Grátis
            </button>
          </div>

          {/* TAB 2: Real Login */}
          {activeTab === 'real' && (
            <form onSubmit={handleRealLogin} className="space-y-5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  E-mail Principal (Real)
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-3.5 text-slate-500" />
                  <input
                    type="email"
                    placeholder="exemplo@hbflow.com"
                    value={realEmail}
                    onChange={(e) => setRealEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-primary rounded-xl py-3 pl-12 pr-4 text-sm text-slate-200 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-3.5 text-slate-500" />
                  <input
                    type="password"
                    placeholder="Sua senha"
                    value={realPassword}
                    onChange={(e) => setRealPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-primary rounded-xl py-3 pl-12 pr-4 text-sm text-slate-200 outline-none transition-all"
                  />
                </div>
              </div>

              {realError && (
                <p className="text-xs text-rose-500 font-semibold bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  {realError}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoggingInReal}
                className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary/20 hover:shadow-primary/35 flex items-center justify-center gap-2 group active:scale-[0.98] cursor-pointer"
              >
                {isLoggingInReal ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Acessar HBFlow</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: Free Trial Registration */}
          {activeTab === 'trial' && (
            <form onSubmit={handleTrialRegister} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Nome Completo
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="João Silva Santos"
                    value={trialName}
                    onChange={(e) => setTrialName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-primary rounded-xl py-2.5 pl-12 pr-4 text-sm text-slate-200 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Nome da Empresa
                </label>
                <div className="relative">
                  <Building size={16} className="absolute left-4 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Sua Empresa Ltda"
                    value={trialCompany}
                    onChange={(e) => setTrialCompany(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-primary rounded-xl py-2.5 pl-12 pr-4 text-sm text-slate-200 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  CNPJ
                </label>
                <div className="relative">
                  <CreditCard size={16} className="absolute left-4 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={trialCnpj}
                    onChange={handleCnpjChange}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-primary rounded-xl py-2.5 pl-12 pr-4 text-sm text-slate-200 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  E-mail Principal
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-3 text-slate-500" />
                  <input
                    type="email"
                    placeholder="nome@empresa.com"
                    value={trialEmail}
                    onChange={(e) => setTrialEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-primary rounded-xl py-2.5 pl-12 pr-4 text-sm text-slate-200 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Telefone
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={trialPhone}
                    onChange={handlePhoneChange}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-primary rounded-xl py-2.5 pl-12 pr-4 text-sm text-slate-200 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Cupom de Desconto (Opcional)
                </label>
                <div className="relative">
                  <Copy size={16} className="absolute left-4 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Ex: CUPOM100"
                    value={trialCoupon}
                    onChange={(e) => setTrialCoupon(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-primary rounded-xl py-2.5 pl-12 pr-4 text-sm text-slate-200 outline-none transition-all uppercase font-mono"
                  />
                </div>
              </div>

              {trialError && (
                <p className="text-xs text-rose-500 font-semibold bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  {trialError}
                </p>
              )}

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/35 flex items-center justify-center gap-2 group active:scale-[0.98] cursor-pointer"
              >
                {isRegistering ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{trialCoupon.trim().toUpperCase() === 'CUPOM100' ? 'Criando Conta Comercial...' : 'Criando Conta de Teste...'}</span>
                  </>
                ) : (
                  <>
                    <span>{trialCoupon.trim().toUpperCase() === 'CUPOM100' ? 'Criar Conta Comercial' : 'Iniciar Teste Grátis'}</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}


        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-6 flex items-center justify-center gap-1">
          <span>HBFlow CRM v1.0.0</span>
          <HelpCircle size={12} className="cursor-pointer hover:text-slate-300" />
        </p>
      </div>

      {/* Glassmorphic Credentials Popup Modal (Showbox) */}
      {showModal && credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800/90 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[80px]" />
            
            {/* Success Icon */}
            <div className="flex justify-center mb-4">
              <div className="p-3.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-500">
                <ShieldCheck size={36} />
              </div>
            </div>
            
            {/* Header */}
            {(() => {
              const isCommercial = credentials && (new Date(credentials.trialEndsAt).getTime() - Date.now() > 5 * 24 * 60 * 60 * 1000);
              return (
                <>
                  <h3 className="text-xl font-bold text-center text-slate-100 mb-2">
                    {isCommercial ? 'Conta Comercial Ativada!' : 'Acesso de 3 Dias Ativo!'}
                  </h3>
                  <p className="text-xs text-center text-slate-400 mb-6 px-4 leading-relaxed">
                    {isCommercial 
                      ? 'Sua conta comercial com cupom de desconto de 100% foi criada com sucesso.' 
                      : 'Sua conta de teste grátis foi criada. Salve as credenciais abaixo para não perder o acesso ao sistema.'}
                  </p>
                </>
              );
            })()}
            
            {/* Credentials display */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  E-mail de Login
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-3">
                  <span className="text-sm font-semibold text-slate-200 truncate flex-1">{credentials.loginEmail}</span>
                  <button
                    onClick={() => handleCopy(credentials.loginEmail, 'email')}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all ml-2 cursor-pointer"
                    title="Copiar e-mail"
                  >
                    {copiedType === 'email' ? <Check size={16} className="text-emerald-500 animate-scale-in" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Senha Temporária
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-3">
                  <span className="text-sm font-mono font-semibold text-slate-200 flex-1">{credentials.password}</span>
                  <button
                    onClick={() => handleCopy(credentials.password, 'password')}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all ml-2 cursor-pointer"
                    title="Copiar senha"
                  >
                    {copiedType === 'password' ? <Check size={16} className="text-emerald-500 animate-scale-in" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              
              {/* Expiration Notice */}
              <div className="flex items-center gap-2.5 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/60">
                <Calendar size={15} className="text-indigo-400 shrink-0" />
                <span className="text-xs text-slate-400 leading-normal">
                  Válido até: <strong>{new Date(credentials.trialEndsAt).toLocaleDateString('pt-BR')}</strong> às <strong>{new Date(credentials.trialEndsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
                </span>
              </div>
            </div>
            
            {/* Actions */}
            <button
              onClick={handleAutoLogin}
              disabled={isLoggingInAuto}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/35 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoggingInAuto ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Configurando Sessão...</span>
                </>
              ) : (
                <>
                  <span>Acessar Sistema</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
