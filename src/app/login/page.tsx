'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { ShieldCheck, HelpCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { tenants, users, currentUserId, setCurrentUserId, currentTenantId, setCurrentTenantId } = useStore();
  const [email, setEmail] = useState('contato@hbflow.com');
  const [password, setPassword] = useState('********');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    // Redirect to dashboard
    router.push('/dashboard');
  };

  const selectedUser = users.find(u => u.id === currentUserId) || users[0];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md z-10">
        {/* Brand logo header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-white font-extrabold text-2xl shadow-xl shadow-primary/30 mb-4">
            HB
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            HB<span className="text-primary">Flow</span>
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Gestão de WhatsApp + CRM Omnichannel Multi-tenant
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Tenant Selection */}
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

            {/* Profile Selection */}
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

            {/* Simulated Credentials */}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none focus:border-primary transition-all"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-500 font-semibold bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary/20 hover:shadow-primary/35 flex items-center justify-center gap-2 group active:scale-[0.98] cursor-pointer"
            >
              <span>Acessar HBFlow</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

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
    </div>
  );
}
