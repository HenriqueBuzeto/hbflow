'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Bell, HelpCircle, Check, Building2, ChevronDown, LogOut } from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const {
    tenants,
    currentTenantId,
    setCurrentTenantId,
    notifications,
    markNotificationRead,
    clearNotifications,
    darkMode,
    toggleDarkMode,
    users,
    currentUserId,
    setUserPresence,
    resetUserSessionState
  } = useStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      resetUserSessionState();
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      router.push('/login');
    }
  };

  const activeTenant = tenants.find((t) => t.id === currentTenantId) || tenants[0] || { id: '', name: 'Empresa', slug: '', plan: 'starter', status: 'active', createdAt: undefined };
  // Subscription countdown helper
  const getSubscriptionCountdown = () => {
    if (activeTenant.plan === 'free' || !activeTenant.subscription?.currentPeriodEnd) return null;
    const end = new Date(activeTenant.subscription.currentPeriodEnd).getTime();
    const diffMs = end - Date.now();
    const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    return {
      daysRemaining: diffDays,
      expired: diffMs <= 0,
      dateStr: new Date(activeTenant.subscription.currentPeriodEnd).toLocaleDateString('pt-BR'),
    };
  };

  const subCountdown = getSubscriptionCountdown();

  // Dynamically generated billing notifications
  const billingNotifications: any[] = [];
  if (subCountdown) {
    if (subCountdown.daysRemaining > 0 && subCountdown.daysRemaining <= 3) {
      const days = subCountdown.daysRemaining;
      const msg = days === 1
        ? 'Amanhã seu sistema irá bloquear. Realize o pagamento para evitar suspensão!'
        : `Sua fatura vence em ${days} dias. Evite bloqueio do sistema realizando o pagamento.`;
      
      billingNotifications.push({
        id: `dynamic-billing-warning-${days}`,
        title: '⚠️ Aviso de Vencimento',
        message: msg,
        type: 'system',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    } else if (subCountdown.expired) {
      billingNotifications.push({
        id: 'dynamic-billing-expired',
        title: '🚨 Sistema Bloqueado',
        message: 'Sua assinatura venceu. Realize o pagamento para desbloquear o sistema.',
        type: 'system',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  const allNotifications = [...billingNotifications, ...notifications];
  const unreadNotifications = allNotifications.filter((n) => !n.isRead);
  const fallbackPresence = (typeof window !== 'undefined' ? localStorage.getItem('hbflow-presence') : null) || 'online';
  const currentUser = users.find((u) => u.id === currentUserId) || users[0] || { id: '', name: 'Usuário', email: '', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces', role: 'Atendente', presence: fallbackPresence as any };

  // Trial countdown helper
  const getTrialCountdown = () => {
    if (activeTenant.status !== 'trial' || !activeTenant.createdAt) return null;
    const trialStart = new Date(activeTenant.createdAt).getTime();
    const trialEnd = trialStart + 3 * 24 * 60 * 60 * 1000; // 3 dias em ms
    const diffMs = trialEnd - Date.now();
    
    if (diffMs <= 0) {
      return { expired: true, text: 'expirado' };
    }
    
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
    
    let text = '';
    if (days > 0) {
      text = `${days}d ${hours}h`;
    } else if (hours > 0) {
      text = `${hours}h ${minutes}m`;
    } else {
      text = `${minutes}m`;
    }
    
    return { expired: false, text };
  };

  const trialInfo = getTrialCountdown();

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
      {/* Left: Tenant Selector & Trial Countdown */}
      <div className="flex items-center gap-4 relative">
        <button
          onClick={() => setShowTenantDropdown(!showTenantDropdown)}
          className="flex items-center gap-2 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Building2 size={16} className="text-primary shrink-0" />
          <span>{activeTenant.name}</span>
          <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showTenantDropdown ? 'rotate-180' : ''}`} />
        </button>



        {showTenantDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowTenantDropdown(false)} />
            <div className="absolute left-0 top-11 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-1.5 w-64 z-50 animate-in fade-in slide-in-from-top-1 duration-150 flex flex-col gap-0.5">
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800/60 mb-1 select-none">
                Selecionar Empresa (Tenant)
              </span>
              {tenants.map((t) => {
                const isSelected = t.id === currentTenantId;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setCurrentTenantId(t.id);
                      setShowTenantDropdown(false);
                    }}
                    className={`w-full text-left text-xs px-2.5 py-2 rounded-xl transition-all flex items-center justify-between font-bold cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{t.name}</span>
                    {isSelected && <Check size={14} className="text-primary" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Right: Actions, Notifications, Simulator */}
      <div className="flex items-center gap-3">
        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors relative cursor-pointer"
          >
            <Bell size={18} />
            {unreadNotifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadNotifications.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-2 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Notificações</span>
                {unreadNotifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-[10px] font-semibold text-primary hover:underline"
                  >
                    Limpar tudo
                  </button>
                )}
              </div>
              <div className="py-1">
                {allNotifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">Nenhuma notificação ativa.</div>
                ) : (
                  allNotifications.map((not) => (
                    <div
                      key={not.id}
                      onClick={() => {
                        if (not.id.toString().startsWith('dynamic-billing')) {
                          router.push('/financeiro');
                        } else {
                          markNotificationRead(not.id);
                        }
                      }}
                      className={`p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer flex gap-2 mb-1 ${
                        !not.isRead 
                          ? not.id.toString().startsWith('dynamic-billing')
                            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-l-2 border-rose-500'
                            : 'bg-primary/5 border-l-2 border-primary' 
                          : ''
                      }`}
                    >
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-250">{not.title}</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-450 mt-0.5">{not.message}</p>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-1">
                          {not.id.toString().startsWith('dynamic-billing') ? 'Agora mesmo' : new Date(not.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      {!not.isRead && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        {/* Support Link */}
        <a
          href="#"
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors hidden sm:block mr-1"
          title="Ajuda"
        >
          <HelpCircle size={18} />
        </a>

        {/* Divider */}
        <span className="w-px h-6 bg-slate-200 dark:bg-slate-800 hidden md:block" />

        {/* User Presence & Profile Dropdown */}
        <div className="relative flex items-center">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 p-1.5 px-2.5 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-all cursor-pointer select-none"
          >
            <div className="relative">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/20"
              />
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                currentUser.presence === 'online' ? 'bg-emerald-500' :
                currentUser.presence === 'away' ? 'bg-amber-500' :
                currentUser.presence === 'lunch' ? 'bg-orange-500' :
                currentUser.presence === 'break' ? 'bg-purple-500' :
                currentUser.presence === 'meeting' ? 'bg-rose-500' : 'bg-slate-400'
              }`} />
            </div>
            <div className="text-left hidden md:block">
              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-none">
                {currentUser.name}
              </p>
              <p className="text-[9px] text-slate-400 font-semibold mt-1">
                {currentUser.presence === 'online' ? '🟢 Online' :
                 currentUser.presence === 'away' ? '🟡 Ausente' :
                 currentUser.presence === 'lunch' ? '🧡 Almoço' :
                 currentUser.presence === 'break' ? '☕ Pausa' :
                 currentUser.presence === 'meeting' ? '🔴 Reunião' : '⚪ Offline'}
              </p>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showUserDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserDropdown(false)} />
              <div className="absolute right-0 top-11 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-2 w-56 z-50 animate-in fade-in slide-in-from-top-1 duration-150 flex flex-col gap-1">
                <div className="px-2.5 py-2 border-b border-slate-100 dark:border-slate-800/60 mb-1.5">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-none">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate">{currentUser.email}</p>
                  <span className="inline-block bg-primary/10 text-primary text-[8px] font-extrabold px-1.5 py-0.5 rounded-full mt-1.5 uppercase">
                    {currentUser.role}
                  </span>
                </div>

                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block px-2.5 mb-1 select-none">
                  Alterar Status
                </span>

                {[
                  { value: 'online', label: 'Online', icon: '🟢', color: 'text-emerald-500' },
                  { value: 'away', label: 'Ausente', icon: '🟡', color: 'text-amber-500' },
                  { value: 'lunch', label: 'Almoço', icon: '🧡', color: 'text-orange-500' },
                  { value: 'break', label: 'Pausa', icon: '☕', color: 'text-purple-500' },
                  { value: 'meeting', label: 'Reunião', icon: '🔴', color: 'text-rose-500' },
                  { value: 'offline', label: 'Offline', icon: '⚪', color: 'text-slate-400' }
                ].map((item) => {
                  const isSelected = currentUser.presence === item.value;
                  return (
                    <button
                      key={item.value}
                      onClick={() => {
                        setUserPresence(currentUser.id, item.value as any);
                        setShowUserDropdown(false);
                      }}
                      className={`w-full text-left text-xs px-2.5 py-2 rounded-xl transition-all flex items-center justify-between font-bold cursor-pointer hover:scale-[1.02] ${
                        isSelected
                          ? 'bg-primary/10 text-primary'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={item.color}>{item.icon}</span>
                        <span>{item.label}</span>
                      </span>
                      {isSelected && <Check size={14} className="text-primary" />}
                    </button>
                  );
                })}

                {/* Botão de Sair */}
                <div className="border-t border-slate-100 dark:border-slate-800/60 mt-1.5 pt-1.5">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left text-xs px-2.5 py-2 rounded-xl transition-all flex items-center gap-2 font-bold cursor-pointer text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                  >
                    <LogOut size={14} className="shrink-0" />
                    <span>Sair da Conta</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
