'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { 
  ShieldCheck, 
  HelpCircle, 
  ArrowRight, 
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
  const { tenants, users, currentUserId, setCurrentUserId, currentTenantId, setCurrentTenantId } = useStore();
  
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'simulacao' | 'real' | 'trial'>('simulacao');

  // Simulation tab state
  const [simPassword, setSimPassword] = useState('********');
  const [simError, setSimError] = useState('');

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
  const handleSimulatedLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setSimError('');
    const selectedUser = users.find(u => u.id === currentUserId) || users[0];
    if (!selectedUser) {
      setSimError('Selecione um usuário para simular.');
      return;
    }
    // Redirect directly (mock database sync is already active)
    router.push('/dashboard');
  };

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

      const currentTenants = useStore.getState().tenants;
      const currentUsers = useStore.getState().users;
      const tenantExists = currentTenants.some(t => t.id === newTenant.id);
      const userExists = currentUsers.some(u => u.id === newUser.id);

      useStore.setState({
        tenants: tenantExists ? currentTenants : [...currentTenants, newTenant],
        users: userExists ? currentUsers : [...currentUsers, newUser],
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
          phone: trialPhone
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

      const currentTenants = useStore.getState().tenants;
      const currentUsers = useStore.getState().users;
      const tenantExists = currentTenants.some(t => t.id === newTenant.id);
      const userExists = currentUsers.some(u => u.id === newUser.id);

      useStore.setState({
        tenants: tenantExists ? currentTenants : [...currentTenants, newTenant],
        users: userExists ? currentUsers : [...currentUsers, newUser],
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

  const selectedUser = users.find(u => u.id === currentUserId) || users[0] || { email: '', name: '', role: '' };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12 relative overflow-hidden always-dark">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md z-10">
        {/* Brand logo header */}
        <div className="text-center mb-8 flex flex-col items-center justify-center">
          <img src="/logo hbflow.png" alt="HBFlow Logo" className="h-14 object-contain mb-4" />
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
              onClick={() => setActiveTab('simulacao')}
              className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'simulacao'
                  ? 'bg-slate-800 text-white shadow-md border border-slate-700/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Simulação
            </button>
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

          {/* TAB 1: Simulation */}
          {activeTab === 'simulacao' && (
            <form onSubmit={handleSimulatedLogin} className="space-y-5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Empresa (Tenant ID)
                </label>
                <select
                  value={currentTenantId}
                  onChange={(e) => setCurrentTenantId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none focus:border-primary transition-all cursor-pointer font-medium"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.slug.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Perfil de Atendente (Simulação)
                </label>
                <select
                  value={currentUserId}
                  onChange={(e) => setCurrentUserId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none focus:border-primary transition-all cursor-pointer font-medium"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  E-mail do Usuário
                </label>
                <input
                  type="email"
                  value={selectedUser.email}
                  disabled
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-500 cursor-not-allowed outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={simPassword}
                  onChange={(e) => setSimPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none focus:border-primary transition-all"
                />
              </div>

              {simError && (
                <p className="text-xs text-rose-500 font-semibold bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  {simError}
                </p>
              )}

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary/20 hover:shadow-primary/35 flex items-center justify-center gap-2 group active:scale-[0.98] cursor-pointer"
              >
                <span>Simular Acesso</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          )}

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
                    <span>Criando Conta de Teste...</span>
                  </>
                ) : (
                  <>
                    <span>Iniciar Teste Grátis</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Notice */}
          <div className="mt-6 flex items-start gap-2.5 bg-slate-900/40 rounded-xl p-3 border border-slate-800/60">
            <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 leading-relaxed">
              <strong>Isolamento Multi-tenant Ativo:</strong> Cada tenant possui isolamento estrito no banco. Atendentes não visualizam conexões ou oportunidades de outros tenants.
            </p>
          </div>
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
            <h3 className="text-xl font-bold text-center text-slate-100 mb-2">
              Acesso de 3 Dias Ativo!
            </h3>
            <p className="text-xs text-center text-slate-400 mb-6 px-4 leading-relaxed">
              Sua conta de teste grátis foi criada. Salve as credenciais abaixo para não perder o acesso ao sistema.
            </p>
            
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
