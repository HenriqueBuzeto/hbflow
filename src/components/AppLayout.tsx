'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { darkMode, fetchUsers, demo_mode_enabled } = useStore();

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
