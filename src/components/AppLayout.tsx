'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import Sidebar from './Sidebar';
import Header from './Header';
import ServerStatusBanner from './ServerStatusBanner';
import TrialBanner from './TrialBanner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { 
    darkMode, 
    fetchUsers, 
    syncDatabaseState, 
    demo_mode_enabled, 
    conversations, 
    isBlocked,
    currentUserId,
    currentTenantId,
    users,
    tenants
  } = useStore();

  const [subscriptionAccess, setSubscriptionAccess] = useState<{ daysRemaining: number; status: string } | null>(null);

  const isPublicPage =
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/agentes') ||
    pathname === '/billing' ||
    pathname === '/renovar';

  useEffect(() => {
    if (!isPublicPage && !demo_mode_enabled && !isBlocked) {
      fetch('/api/v1/billing/subscription')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.access) {
            setSubscriptionAccess({
              daysRemaining: data.access.daysRemaining,
              status: data.access.status
            });
          }
        })
        .catch((err) => console.error('Error fetching subscription access info:', err));
    }
  }, [isPublicPage, demo_mode_enabled, isBlocked]);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    if (!isPublicPage && !demo_mode_enabled) {
      fetchUsers().catch((err) => console.error('Error fetching user profile in layout:', err));
    }
  }, [isPublicPage, demo_mode_enabled, fetchUsers]);

  // Automatic redirect to billing if blocked and trying to access operational routes
  useEffect(() => {
    if (!isPublicPage && isBlocked) {
      router.push('/billing');
    }
  }, [isPublicPage, isBlocked, router]);

  // Atualiza dinamicamente o título da aba do navegador de acordo com chamados ativos ou mensagens não lidas
  useEffect(() => {
    if (isPublicPage || demo_mode_enabled) return;
    const activeCount = conversations.filter(
      (c) => c.status === 'new' || c.status === 'open' || (c.status !== 'closed' && c.unreadCount > 0)
    ).length;

    if (activeCount > 0) {
      document.title = `(${activeCount}) Atendimentos | HBFlow`;
    } else {
      document.title = 'HBFlow';
    }
  }, [conversations, isPublicPage, demo_mode_enabled]);

  // Sincronização global de conversas, mensagens e contatos a cada 3 segundos nas rotas autenticadas
  useEffect(() => {
    if (isPublicPage || demo_mode_enabled || isBlocked) return;

    let pollTimeout: NodeJS.Timeout;
    let isSyncing = false;

    const doSync = async () => {
      // Prevent sync if tab is hidden or already syncing to save resources and avoid duplicates
      if (document.visibilityState !== 'visible' || isSyncing) {
        pollTimeout = setTimeout(doSync, 3000);
        return;
      }
      
      isSyncing = true;
      try {
        await syncDatabaseState();
      } catch (err) {
        console.error('Erro na sincronização de background:', err);
      } finally {
        isSyncing = false;
        pollTimeout = setTimeout(doSync, 3000);
      }
    };

    // Dispara a sincronização inicial imediatamente
    doSync();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isSyncing) {
        // Immediately sync when the user focuses the tab
        clearTimeout(pollTimeout);
        doSync();
      }
    };

    window.addEventListener('focus', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(pollTimeout);
      window.removeEventListener('focus', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPublicPage, demo_mode_enabled, syncDatabaseState, isBlocked]);

  if (isPublicPage) {
    return <>{children}</>;
  }

  // Render blocked Paywall screen instead of actual operational page
  if (isBlocked) {
    const currentUser = users.find((u) => u.id === currentUserId);
    const currentTenant = tenants.find((t) => t.id === currentTenantId);

    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 font-sans p-6 relative overflow-hidden always-dark">
        {/* Background glow decoration */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative z-10 flex flex-col items-center">
          {/* Logo */}
          <img src="/logo hbflow.png" alt="HBFlow Logo" className="h-[220px] w-auto object-contain my-[-90px] mx-[-70px] mb-[-60px]" />
          
          <h2 className="text-lg font-black text-white mb-2 uppercase tracking-wide">
            Assinatura Expirada
          </h2>
          
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Seu período de teste grátis ou assinatura do **HBFlow** chegou ao fim. Para continuar usando seus agentes inteligentes e WhatsApp CRM, assine um plano.
          </p>

          {/* Tenant Details */}
          <div className="w-full bg-slate-950/60 border border-white/5 rounded-2xl p-4 text-left space-y-2.5 mb-6 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Empresa:</span>
              <span className="text-slate-200 font-bold">{currentTenant?.name || 'Carregando...'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Operador:</span>
              <span className="text-slate-300 font-mono">{currentUser?.email || 'Carregando...'}</span>
            </div>
            <div className="border-t border-white/5 pt-2 flex justify-between items-center text-emerald-400 font-semibold">
              <span>Status dos Dados:</span>
              <span>Totalmente Preservados 🛡️</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="w-full flex flex-col gap-3">
            <button 
              onClick={() => router.push('/billing')}
              className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-primary/25 active:scale-[0.98]"
            >
              Assinar Plano / Adicionar Cupom
            </button>
            
            <button 
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  useStore.getState().resetUserSessionState();
                  window.location.href = '/login';
                } catch (err) {
                  console.error('Logout error:', err);
                  window.location.href = '/login';
                }
              }}
              className="w-full bg-slate-950 hover:bg-slate-900 border border-white/5 text-slate-400 hover:text-white text-xs font-bold py-3 rounded-xl transition-all cursor-pointer"
            >
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans">
      {/* Dark Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {subscriptionAccess && (
          <TrialBanner 
            daysRemaining={subscriptionAccess.daysRemaining} 
            status={subscriptionAccess.status} 
          />
        )}

        {/* White Header with simulator */}
        <Header />

        {/* Banner de status do servidor local — aparece apenas quando há problema */}
        <ServerStatusBanner />

        {/* Dynamic page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
          {children}
        </main>
      </div>
    </div>
  );
}
