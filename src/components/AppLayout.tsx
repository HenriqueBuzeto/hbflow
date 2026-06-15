'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { darkMode, fetchUsers, syncDatabaseState, demo_mode_enabled } = useStore();

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

  // Sincronização global de conversas, mensagens e contatos a cada 5 segundos nas rotas autenticadas
  useEffect(() => {
    if (isPublicPage || demo_mode_enabled) return;

    // Dispara a sincronização inicial imediatamente
    syncDatabaseState().catch((err) => console.error('Erro na sincronização inicial:', err));

    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        syncDatabaseState().catch((err) => console.error('Erro na sincronização de foco:', err));
      }
    };

    const pollInterval = setInterval(() => {
      syncDatabaseState().catch((err) => console.error('Erro no polling de background:', err));
    }, 5000);

    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
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

        {/* Dynamic page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
          {children}
        </main>
      </div>
    </div>
  );
}
