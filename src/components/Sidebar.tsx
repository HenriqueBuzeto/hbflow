'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';
import {
  LayoutDashboard,
  MessageSquare,
  Layers,
  Zap,
  Users,
  Clock,
  Tag,
  HelpCircle,
  Megaphone,
  Info,
  Code,
  UserCheck,
  GitFork,
  Link2,
  Settings,
  Building2,
  ChevronLeft,
  ChevronRight,
  User,
  ShieldAlert,
  Bot
} from 'lucide-react';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { users, currentUserId, conversations } = useStore();

  const currentUser = users.find((u) => u.id === currentUserId) || users[0] || { id: '', name: 'Usuário', email: '', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces', role: 'Atendente', presence: 'offline' };
  const unreadCount = conversations.reduce((acc, c) => acc + (c.status !== 'closed' && c.unreadCount > 0 ? 1 : 0), 0);

  const operationalMenu = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Atendimentos', href: '/inbox', icon: MessageSquare, badge: unreadCount },
    { name: 'Painel de Atendimentos', href: '/painel', icon: ShieldAlert },
    { name: 'Respostas Rápidas', href: '/setores', icon: Zap },
    { name: 'Kanban', href: '/pipeline', icon: Layers },
    { name: 'Contatos', href: '/clientes', icon: Users },
    { name: 'Agendamentos', href: '/agendamentos', icon: Clock },
    { name: 'Tags', href: '/tags', icon: Tag },
    { name: 'Chat Interno', href: '/chat-interno', icon: MessageSquare },
    { name: 'Ajuda', href: '/ajuda', icon: HelpCircle }
  ];

  const adminMenu = [
    { name: 'Campanhas', href: '/campanhas', icon: Megaphone },
    { name: 'Informativos', href: '/informativos', icon: Info },
    { name: 'API', href: '/api-keys', icon: Code },
    { name: 'Usuários', href: '/usuarios', icon: UserCheck },
    { name: 'Filas & Chatbot', href: '/fluxos', icon: GitFork },
    { name: 'Agentes IA', href: '/dashboard/agentes', icon: Bot },
    { name: 'Conexões', href: '/conexao', icon: Link2 },
    { name: 'Configurações', href: '/configuracoes', icon: Settings },
    { name: 'Empresas', href: '/empresas', icon: Building2 }
  ];

  const renderLink = (item: typeof operationalMenu[0]) => {
    const isActive = pathname === item.href;
    const Icon = item.icon;
    return (
      <Link
        key={item.name}
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 group relative ${
          isActive
            ? 'bg-primary text-white shadow-md shadow-primary/20'
            : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
        }`}
      >
        <Icon size={16} className={isActive ? 'text-white' : 'text-zinc-400 group-hover:text-white'} />
        {!isCollapsed && <span className="truncate">{item.name}</span>}

        {/* Badge */}
        {item.badge !== undefined && item.badge > 0 && (
          <span className={`absolute right-2 px-1.5 py-0.5 text-[9px] font-bold rounded-full ${
            isActive ? 'bg-white text-primary' : 'bg-primary text-white'
          }`}>
            {item.badge}
          </span>
        )}

        {/* Tooltip for collapsed mode */}
        {isCollapsed && (
          <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-950 text-white text-[10px] rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap shadow-lg">
            {item.name}
          </div>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={`bg-sidebar-bg text-sidebar-fg flex flex-col transition-all duration-300 border-r border-zinc-800 ${
        isCollapsed ? 'w-16' : 'w-64'
      } shrink-0 h-screen sticky top-0 z-30`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-center border-b border-zinc-800 shrink-0 relative px-4">
        {!isCollapsed && (
          <div className="flex items-center justify-center h-full">
            <img src="/logo hbflow.png" alt="HBFlow Logo" className="h-[450px] w-auto object-contain my-[-200px] ml-[-170px] mr-[-160px]" />
          </div>
        )}
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded transition-colors hidden md:block ${
            isCollapsed ? 'mx-auto' : 'absolute right-4'
          }`}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Profile Switcher Quick Select */}
      <div className="p-3 border-b border-zinc-800 shrink-0">
        {!isCollapsed ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 px-1">
              <div className="relative shrink-0">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/20"
                />
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${
                  currentUser.presence === 'online' ? 'bg-emerald-500' :
                  currentUser.presence === 'away' ? 'bg-amber-500' :
                  currentUser.presence === 'lunch' ? 'bg-orange-500' :
                  currentUser.presence === 'break' ? 'bg-purple-500' :
                  currentUser.presence === 'meeting' ? 'bg-rose-500' : 'bg-slate-400'
                }`} />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-white text-[11px] block truncate">{currentUser.name}</span>
                <span className="text-[9px] text-zinc-500 capitalize block truncate font-medium">
                  {currentUser.presence === 'online' ? '🟢 Online' :
                   currentUser.presence === 'away' ? '🟡 Ausente' :
                   currentUser.presence === 'lunch' ? '🧡 Almoço' :
                   currentUser.presence === 'break' ? '☕ Pausa' :
                   currentUser.presence === 'meeting' ? '🔴 Reunião' : '⚪ Offline'}
                </span>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex justify-center relative" title={`Perfil: ${currentUser.name} (${currentUser.presence})`}>
            <div className="relative">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/20"
              />
              <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-zinc-950 ${
                currentUser.presence === 'online' ? 'bg-emerald-500' :
                currentUser.presence === 'away' ? 'bg-amber-500' :
                currentUser.presence === 'lunch' ? 'bg-orange-500' :
                currentUser.presence === 'break' ? 'bg-purple-500' :
                currentUser.presence === 'meeting' ? 'bg-rose-500' : 'bg-slate-400'
              }`} />
            </div>
          </div>
        )}
      </div>

      {/* Navigation List Area */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* OPERATIONAL MENU */}
        <div>
          {!isCollapsed && (
            <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-600 block px-3 mb-2">
              Operacional
            </span>
          )}
          <nav className="space-y-0.5">{operationalMenu.map(renderLink)}</nav>
        </div>

        {/* ADMIN MENU */}
        <div>
          {!isCollapsed && (
            <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-600 block px-3 mb-2">
              Administração
            </span>
          )}
          <nav className="space-y-0.5">{adminMenu.map(renderLink)}</nav>
        </div>
      </div>

      {/* FOOTER SYSTEM VERSION */}
      <div className="h-10 border-t border-zinc-800 bg-zinc-950 flex items-center justify-center text-[10px] text-zinc-500 shrink-0 font-mono">
        {!isCollapsed ? (
          <span>HBFlow v1.2.0-stable</span>
        ) : (
          <span>1.2d</span>
        )}
      </div>
    </aside>
  );
}
