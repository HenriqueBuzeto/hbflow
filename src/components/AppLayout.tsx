'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import Sidebar from './Sidebar';
import Header from './Header';
import ServerStatusBanner from './ServerStatusBanner';
import TrialBanner from './TrialBanner';
import { Sparkles } from 'lucide-react';

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
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<any>(null);

  const isPublicPage =
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/agentes') ||
    pathname === '/billing' ||
    pathname === '/renovar';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const credsStr = localStorage.getItem('hbflow_pending_credentials');
      if (credsStr) {
        setPendingCredentials(JSON.parse(credsStr));
        setShowPendingModal(true);
      }
    }
  }, []);

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

  // Dynamic page title update according to active conversations or unread messages
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

  // Global background synchronization of conversations, messages and contacts every 3 seconds on authenticated routes
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

    // Trigger initial sync immediately
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
            Seu período de teste grátis ou assinatura do **HBFlow** chegou ao fim. Para continuar usando seus agentes inteligentes e WhatsApp CRM, assine um plan.
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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans relative">
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

      {/* Premium Credentials Copy Modal for direct dashboard landings (e.g. Free Trials or completed checkout) */}
      {showPendingModal && pendingCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden text-center flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center animate-bounce shadow-lg relative z-10 shrink-0">
              <Sparkles size={32} />
            </div>

            <div className="space-y-2 relative z-10 w-full">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Conta Criada com Sucesso! 🎉</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Sua conta de teste grátis foi ativada. Guarde suas credenciais de login geradas abaixo para futuros acessos:
              </p>
              
              <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 my-2 text-left space-y-3 w-full">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">Login / Email</span>
                  <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl px-3 py-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate flex-1">{pendingCredentials.loginEmail}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(pendingCredentials.loginEmail);
                        alert('Email copiado!');
                      }}
                      className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">Senha Inicial</span>
                  <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl px-3 py-2">
                    <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 flex-1">{pendingCredentials.password}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(pendingCredentials.password);
                        alert('Senha copiada!');
                      }}
                      className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                localStorage.removeItem('hbflow_pending_credentials');
                setShowPendingModal(false);
              }}
              className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-2xl font-black text-xs transition-all shadow-lg cursor-pointer relative z-10"
            >
              Acessar o Painel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
