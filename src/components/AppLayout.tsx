'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';
import Sidebar from './Sidebar';
import Header from './Header';
import ServerStatusBanner from './ServerStatusBanner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { darkMode, fetchUsers, syncDatabaseState, demo_mode_enabled, conversations } = useStore();

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const isPublicPage =
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/agentes') ||
    pathname === '/billing' ||
    pathname === '/renovar';

  useEffect(() => {
    if (!isPublicPage && !demo_mode_enabled) {
      fetchUsers().catch((err) => console.error('Error fetching user profile in layout:', err));
    }
  }, [isPublicPage, demo_mode_enabled, fetchUsers]);

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
    if (isPublicPage || demo_mode_enabled) return;

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
  }, [isPublicPage, demo_mode_enabled, syncDatabaseState]);

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans">
      {/* Dark Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
