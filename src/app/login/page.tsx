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
  Calendar,
  Sparkles,
  Ticket
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  
  // Navigation tab state: login, real (subscription), trial (free trial)
  const [activeTab, setActiveTab] = useState<'login' | 'real' | 'trial'>('login');

  // Login tab state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Acesso Real (Subscription Registration) tab state
  const [realName, setRealName] = useState('');
  const [realCompany, setRealCompany] = useState('');
  const [realCnpj, setRealCnpj] = useState('');
  const [realEmailReg, setRealEmailReg] = useState('');
  const [realPhone, setRealPhone] = useState('');
  const [realCoupon, setRealCoupon] = useState('');
  const [realPlan, setRealPlan] = useState<'starter' | 'pro'>('starter');
  const [realError, setRealError] = useState('');
  const [isRegisteringReal, setIsRegisteringReal] = useState(false);

  // Coupon apply validation state
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [couponFeedback, setCouponFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [validatedCouponData, setValidatedCouponData] = useState<{ code: string; type: string; value: number } | null>(null);

  const [realPassword, setRealPassword] = useState('');
  const [realConfirmPassword, setRealConfirmPassword] = useState('');
  const [realStep, setRealStep] = useState<1 | 2 | 3>(1);

  const getPricingDetails = () => {
    const basePrice = realPlan === 'pro' ? 199.90 : 99.90;
    let discount = 0;

    if (couponFeedback?.type === 'success' && validatedCouponData) {
      const { type, value } = validatedCouponData;
      if (type === 'percentage') {
        discount = basePrice * (value / 100);
      } else if (type === 'fixed_amount') {
        discount = value;
      } else if (type === 'free_access') {
        discount = basePrice;
      }
    }

    const total = Math.max(0, basePrice - discount);
    return {
      basePrice,
      discount,
      total
    };
  };

  // Free Trial (3 Days) tab state
  const [trialPassword, setTrialPassword] = useState('');
  const [trialConfirmPassword, setTrialConfirmPassword] = useState('');
  const [trialName, setTrialName] = useState('');
  const [trialCompany, setTrialCompany] = useState('');
  const [trialCnpj, setTrialCnpj] = useState('');
  const [trialEmail, setTrialEmail] = useState('');
  const [trialPhone, setTrialPhone] = useState('');
  const [trialError, setTrialError] = useState('');
  const [isRegisteringTrial, setIsRegisteringTrial] = useState(false);

  // Modal / Credentials Showbox state
  const [showModal, setShowModal] = useState(false);
  const [credentials, setCredentials] = useState<{
    loginEmail: string;
    password: string;
    trialEndsAt: string;
    companyName: string;
    userName: string;
    plan?: string;
    isRealPlan?: boolean;
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

  const handleRealCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRealCnpj(formatCNPJ(e.target.value));
  };

  const handleRealPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRealPhone(formatPhone(e.target.value));
  };

  const handleTrialCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTrialCnpj(formatCNPJ(e.target.value));
  };

  const handleTrialPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTrialPhone(formatPhone(e.target.value));
  };

  // Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    if (!loginEmail || !loginPassword) {
      setLoginError('Por favor, preencha todos os campos.');
      setIsLoggingIn(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword
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

      useStore.getState().setDemoModeEnabled(false);
      useStore.setState({
        tenants: [newTenant],
        users: [newUser],
        currentTenantId: newTenant.id,
        currentUserId: newUser.id
      });

      router.push('/dashboard');
    } catch (err: any) {
      setLoginError(err.message || 'Falha ao autenticar.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Acesso Real Register Handler
  const handleRealRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRealError('');
    setIsRegisteringReal(true);

    if (!realName || !realCompany || !realCnpj || !realEmailReg || !realPhone || !realPassword || !realConfirmPassword) {
      setRealError('Por favor, preencha todos os campos obrigatórios, incluindo a senha.');
      setIsRegisteringReal(false);
      return;
    }

    if (realPassword.length < 6) {
      setRealError('A senha deve ter pelo menos 6 caracteres.');
      setIsRegisteringReal(false);
      return;
    }

    if (realPassword !== realConfirmPassword) {
      setRealError('As senhas digitadas não conferem.');
      setIsRegisteringReal(false);
      return;
    }

    try {
      // Usamos o endpoint register-trial passando o cupom e plano escolhido
      const res = await fetch('/api/auth/register-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: realName,
          companyName: realCompany,
          cnpj: realCnpj,
          email: realEmailReg,
          phone: realPhone,
          couponCode: realCoupon || null,
          password: realPassword,
          isTrial: false,
          planSlug: realPlan
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha no cadastro comercial.');
      }

      setCredentials({
        ...data,
        plan: realPlan,
        isRealPlan: true
      });
      setShowModal(true);
    } catch (err: any) {
      setRealError(err.message || 'Falha no cadastro comercial.');
    } finally {
      setIsRegisteringReal(false);
    }
  };

  // Apply Coupon Validation Handler
  const handleApplyCoupon = async () => {
    if (!realCoupon.trim()) return;
    setIsCheckingCoupon(true);
    setCouponFeedback(null);
    try {
      const res = await fetch(`/api/v1/billing/coupons/validate?code=${encodeURIComponent(realCoupon.trim().toUpperCase())}`);
      const data = await res.json();
      if (!res.ok || !data.valid) {
        throw new Error(data.reason || data.error || 'Cupom inválido.');
      }
      setCouponFeedback({
        type: 'success',
        message: `Cupom "${realCoupon.toUpperCase()}" validado com sucesso! Desconto ativo.`
      });
      setValidatedCouponData(data.coupon);
    } catch (err: any) {
      setCouponFeedback({
        type: 'error',
        message: err.message || 'Cupom inválido ou expirado.'
      });
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  // Free Trial Register Handler (Without Coupon Field)
  const handleTrialRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrialError('');
    setIsRegisteringTrial(true);

    if (!trialName || !trialCompany || !trialCnpj || !trialEmail || !trialPhone || !trialPassword || !trialConfirmPassword) {
      setTrialError('Por favor, preencha todos os campos do cadastro, incluindo a senha.');
      setIsRegisteringTrial(false);
      return;
    }

    if (trialPassword.length < 6) {
      setTrialError('A senha deve ter pelo menos 6 caracteres.');
      setIsRegisteringTrial(false);
      return;
    }

    if (trialPassword !== trialConfirmPassword) {
      setTrialError('As senhas digitadas não conferem.');
      setIsRegisteringTrial(false);
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
          couponCode: null, // Forçando nulo no teste grátis (sem cupom)
          password: trialPassword,
          isTrial: true,
          planSlug: 'starter'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha no cadastro de teste grátis.');
      }

      setCredentials({
        ...data,
        isRealPlan: false
      });
      setShowModal(true);
    } catch (err: any) {
      setTrialError(err.message || 'Falha no cadastro.');
    } finally {
      setIsRegisteringTrial(false);
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

      useStore.getState().setDemoModeEnabled(false);
      useStore.setState({
        tenants: [newTenant],
        users: [newUser],
        currentTenantId: newTenant.id,
        currentUserId: newUser.id
      });

      setShowModal(false);
      
      // Se for plano real e tiver valor a pagar (> 0), redireciona para a tela de faturamento (/billing)
      // Se for isento (totalAmountCents === 0), redireciona direto para a tela inicial (/dashboard)
      if (credentials.isRealPlan && (credentials.totalAmountCents ?? 0) > 0) {
        router.push('/billing');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      if (credentials.isRealPlan) {
        setRealError(err.message || 'Erro ao acessar o sistema automaticamente.');
      } else {
        setTrialError(err.message || 'Erro ao acessar o sistema automaticamente.');
      }
      setShowModal(false);
    } finally {
      setIsLoggingInAuto(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12 relative overflow-y-auto always-dark">
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
          <p className="text-sm text-slate-400 mt-2 font-medium">
            Gestão de WhatsApp + CRM Omnichannel Multi-tenant
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
          
          {/* Tab Navigation bar (3 tabs) */}
          <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800/80 mb-6 gap-1">
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setRealStep(1); }}
              className={`flex-1 text-center py-2.5 text-[11px] font-extrabold rounded-xl transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-slate-800 text-white shadow-md border border-slate-700/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('real'); setRealStep(1); }}
              className={`flex-1 text-center py-2.5 text-[11px] font-extrabold rounded-xl transition-all cursor-pointer ${
                activeTab === 'real'
                  ? 'bg-slate-800 text-white shadow-md border border-slate-700/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Criar Conta
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('trial'); setRealStep(1); }}
              className={`flex-1 text-center py-2.5 text-[11px] font-extrabold rounded-xl transition-all cursor-pointer relative ${
                activeTab === 'trial'
                  ? 'bg-slate-800 text-white shadow-md border border-slate-700/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="block">Teste Grátis</span>
              <span className="absolute -top-1.5 -right-1 bg-emerald-500 text-slate-950 font-black text-[7px] px-1 py-0.5 rounded-md uppercase tracking-wider scale-90 border border-slate-950">
                3 dias
              </span>
            </button>
          </div>

          {/* TAB 1: Existing User Login */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  E-mail de Login
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-3.5 text-slate-500" />
                  <input
                    type="email"
                    placeholder="exemplo@hbflow.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
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
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-primary rounded-xl py-3 pl-12 pr-4 text-sm text-slate-200 outline-none transition-all"
                  />
                </div>
              </div>

              {loginError && (
                <p className="text-xs text-rose-500 font-semibold bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary/20 hover:shadow-primary/35 flex items-center justify-center gap-2 group active:scale-[0.98] cursor-pointer"
              >
                {isLoggingIn ? (
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

          {/* TAB 2: Acesso Real (Plan Subscription Sign Up Wizard) */}
          {activeTab === 'real' && (
            <div className="space-y-6">
              {/* Step Indicator */}
              <div className="flex items-center justify-between mb-6 px-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${realStep >= 1 ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>
                    1
                  </div>
                  <span className={`text-[10px] mt-1.5 font-bold transition-colors ${realStep >= 1 ? 'text-primary' : 'text-slate-500'}`}>Triagem</span>
                </div>
                <div className={`h-[2px] flex-1 mx-2 transition-all duration-500 ${realStep >= 2 ? 'bg-primary' : 'bg-slate-800'}`} />
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${realStep >= 2 ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>
                    2
                  </div>
                  <span className={`text-[10px] mt-1.5 font-bold transition-colors ${realStep >= 2 ? 'text-primary' : 'text-slate-500'}`}>Planos</span>
                </div>
                <div className={`h-[2px] flex-1 mx-2 transition-all duration-500 ${realStep >= 3 ? 'bg-primary' : 'bg-slate-800'}`} />
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${realStep >= 3 ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>
                    3
                  </div>
                  <span className={`text-[10px] mt-1.5 font-bold transition-colors ${realStep >= 3 ? 'text-primary' : 'text-slate-500'}`}>Confirmar</span>
                </div>
              </div>

              {realError && (
                <p className="text-xs text-rose-500 font-semibold bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  {realError}
                </p>
              )}

              {/* STEP 1: Triagem */}
              {realStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Nome Completo
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-3 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Seu nome"
                        value={realName}
                        onChange={(e) => setRealName(e.target.value)}
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
                        placeholder="Nome da sua empresa"
                        value={realCompany}
                        onChange={(e) => setRealCompany(e.target.value)}
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
                        value={realCnpj}
                        onChange={handleRealCnpjChange}
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
                        value={realEmailReg}
                        onChange={(e) => setRealEmailReg(e.target.value)}
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
                        value={realPhone}
                        onChange={handleRealPhoneChange}
                        className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-primary rounded-xl py-2.5 pl-12 pr-4 text-sm text-slate-200 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Senha
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-3 text-slate-500" />
                      <input
                        type="password"
                        placeholder="Defina sua senha"
                        value={realPassword}
                        onChange={(e) => setRealPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-primary rounded-xl py-2.5 pl-12 pr-4 text-sm text-slate-200 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Confirmar Senha
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-3 text-slate-500" />
                      <input
                        type="password"
                        placeholder="Confirme sua senha"
                        value={realConfirmPassword}
                        onChange={(e) => setRealConfirmPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-primary rounded-xl py-2.5 pl-12 pr-4 text-sm text-slate-200 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!realName || !realCompany || !realCnpj || !realEmailReg || !realPhone || !realPassword || !realConfirmPassword) {
                        setRealError('Por favor, preencha todos os campos obrigatórios.');
                        return;
                      }
                      if (realPassword.length < 6) {
                        setRealError('A senha deve ter pelo menos 6 caracteres.');
                        return;
                      }
                      if (realPassword !== realConfirmPassword) {
                        setRealError('As senhas digitadas não conferem.');
                        return;
                      }
                      setRealError('');
                      setRealStep(2);
                    }}
                    className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary/20 hover:shadow-primary/35 flex items-center justify-center gap-2 group cursor-pointer active:scale-[0.98]"
                  >
                    <span>Avançar para Planos</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}

              {/* STEP 2: Planos & Cupom */}
              {realStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Escolha o Plano Comercial
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div 
                        onClick={() => setRealPlan('starter')}
                        className={`bg-slate-900 border rounded-2xl p-4 cursor-pointer transition-all ${
                          realPlan === 'starter' 
                            ? 'border-primary ring-1 ring-primary/30 bg-slate-900/60' 
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-white">Starter</span>
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${realPlan === 'starter' ? 'border-primary bg-primary' : 'border-slate-600'}`}>
                            {realPlan === 'starter' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 block">R$ 99,90 / mês</span>
                      </div>

                      <div 
                        onClick={() => setRealPlan('pro')}
                        className={`bg-slate-900 border rounded-2xl p-4 cursor-pointer transition-all ${
                          realPlan === 'pro' 
                            ? 'border-primary ring-1 ring-primary/30 bg-slate-900/60' 
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-white">Pro</span>
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${realPlan === 'pro' ? 'border-primary bg-primary' : 'border-slate-600'}`}>
                            {realPlan === 'pro' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 block">R$ 199,90 / mês</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Cupom de Desconto (Opcional)
                    </label>
                    <div className="relative flex items-center">
                      <Ticket size={16} className="absolute left-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Digite seu cupom"
                        value={realCoupon}
                        onChange={(e) => {
                          setRealCoupon(e.target.value);
                          setCouponFeedback(null);
                          setValidatedCouponData(null);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-primary rounded-xl py-2.5 pl-12 pr-24 text-sm text-slate-200 outline-none transition-all uppercase font-mono tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={isCheckingCoupon || !realCoupon.trim()}
                        className="absolute right-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-lg border border-slate-700 transition-all cursor-pointer active:scale-95"
                      >
                        {isCheckingCoupon ? '...' : 'Aplicar'}
                      </button>
                    </div>
                    {couponFeedback && (
                      <p className={`text-[10.5px] font-bold mt-1.5 ${couponFeedback.type === 'success' ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {couponFeedback.message}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setRealStep(1)}
                      className="flex-1 bg-slate-905 border border-slate-800 hover:bg-slate-900 text-slate-300 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer active:scale-95 text-center"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => setRealStep(3)}
                      className="flex-1 bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-bold text-xs transition-all shadow-lg shadow-primary/20 hover:shadow-primary/35 flex items-center justify-center gap-1 group cursor-pointer active:scale-[0.98]"
                    >
                      <span>Avançar para Resumo</span>
                      <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Resumo & Confirmação de Pagamento */}
              {realStep === 3 && (
                <form onSubmit={handleRealRegister} className="space-y-5">
                  <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4.5 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-800/80 pb-2">
                      Descrição do Pagamento
                    </h4>
                    
                    {(() => {
                      const { basePrice, discount, total } = getPricingDetails();
                      return (
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center text-slate-300">
                            <span>Plano Selecionado:</span>
                            <span className="font-bold text-white uppercase">{realPlan}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-300">
                            <span>Valor Mensal Base:</span>
                            <span className="font-semibold text-slate-100">R$ {basePrice.toFixed(2).replace('.', ',')}</span>
                          </div>
                          {discount > 0 && (
                            <div className="flex justify-between items-center text-emerald-400 font-medium bg-emerald-500/5 px-2 py-1 rounded-lg border border-emerald-500/10">
                              <span>Desconto Aplicado ({validatedCouponData?.code}):</span>
                              <span className="font-bold">- R$ {discount.toFixed(2).replace('.', ',')}</span>
                            </div>
                          )}
                          <div className="border-t border-slate-800/80 pt-2 flex justify-between items-center text-sm">
                            <span className="font-bold text-slate-300">Valor Total Final:</span>
                            <span className="font-black text-white text-base">R$ {total.toFixed(2).replace('.', ',')} / mês</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="bg-slate-900/40 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Método de Ativação:</span>
                    <span className="text-amber-400 font-bold flex items-center gap-1"><Sparkles size={12} /> Checkout InfinitePay</span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setRealStep(2)}
                      disabled={isRegisteringReal}
                      className="flex-1 bg-slate-905 border border-slate-800 hover:bg-slate-900 text-slate-300 py-3.5 rounded-xl font-bold text-xs transition-all cursor-pointer active:scale-95 text-center disabled:opacity-50"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={isRegisteringReal}
                      className="flex-[2] bg-primary hover:bg-primary-hover disabled:bg-primary/50 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold text-xs transition-all shadow-lg shadow-primary/20 hover:shadow-primary/35 flex items-center justify-center gap-1.5 group cursor-pointer active:scale-[0.98]"
                    >
                      {isRegisteringReal ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Processando...</span>
                        </>
                      ) : (
                        <>
                          <span>Criar Conta e Pagar</span>
                          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: Free Trial Registration (NO COUPON FIELD) */}
          {activeTab === 'trial' && (
            <form onSubmit={handleTrialRegister} className="space-y-4">
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-2xl mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  3 dias de acesso liberado
                </span>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Nome Completo
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Seu nome"
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
                    placeholder="Nome da sua empresa"
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
                    onChange={handleTrialCnpjChange}
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
                    onChange={handleTrialPhoneChange}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-primary rounded-xl py-2.5 pl-12 pr-4 text-sm text-slate-200 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-3 text-slate-500" />
                  <input
                    type="password"
                    placeholder="Defina sua senha"
                    value={trialPassword}
                    onChange={(e) => setTrialPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-primary rounded-xl py-2.5 pl-12 pr-4 text-sm text-slate-200 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-3 text-slate-500" />
                  <input
                    type="password"
                    placeholder="Confirme sua senha"
                    value={trialConfirmPassword}
                    onChange={(e) => setTrialConfirmPassword(e.target.value)}
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
                disabled={isRegisteringTrial}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/35 flex items-center justify-center gap-2 group active:scale-[0.98] cursor-pointer"
              >
                {isRegisteringTrial ? (
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
              const isCommercial = credentials.isRealPlan;
              const isFreeCommercial = isCommercial && credentials.totalAmountCents === 0;
              return (
                <>
                  <h3 className="text-xl font-bold text-center text-slate-100 mb-2">
                    {isCommercial ? 'Conta Comercial Criada!' : 'Acesso de 3 Dias Ativo!'}
                  </h3>
                  <p className="text-xs text-center text-slate-400 mb-6 px-4 leading-relaxed">
                    {isCommercial 
                      ? (isFreeCommercial 
                        ? 'Sua conta comercial com desconto de 100% foi ativada com sucesso. Prossiga para acessar o seu painel de controle.' 
                        : 'Sua conta comercial foi pré-registrada. Prossiga para efetuar o pagamento da assinatura e ativar o seu acesso completo.')
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
              
              {/* Expiration Notice / Info */}
              <div className="flex items-center gap-2.5 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/60">
                <Calendar size={15} className="text-indigo-400 shrink-0" />
                <span className="text-xs text-slate-400 leading-normal">
                  {credentials.isRealPlan 
                    ? <span>Plano comercial selecionado: <strong>{credentials.plan === 'pro' ? 'Pro' : 'Starter'}</strong>.</span>
                    : <span>Válido até: <strong>{new Date(credentials.trialEndsAt).toLocaleDateString('pt-BR')}</strong> às <strong>{new Date(credentials.trialEndsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                  }
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
                  <span>{credentials.isRealPlan && credentials.totalAmountCents > 0 ? 'Ir para o Pagamento' : 'Acessar Sistema'}</span>
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
