'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { MessageSquare, Send, User, ShieldCheck, ChevronRight } from 'lucide-react';

interface InternalMessage {
  id: string;
  senderId: string;
  receiverId: string;
  body: string;
  createdAt: string;
}

export default function ChatInternoPage() {
  const router = useRouter();
  const { users, currentUserId, tenants, currentTenantId } = useStore();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [msgText, setMsgText] = useState('');
  const [chatLogs, setChatLogs] = useState<InternalMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const activeTenant = tenants.find((t) => t.id === currentTenantId) || tenants[0];
  const isFeatureBlocked = activeTenant && activeTenant.plan === 'starter';

  const currentUser = users.find((u) => u.id === currentUserId) || users[0] || { id: '', name: 'Usuário', email: '', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces', role: 'Atendente', presence: 'offline' };
  const targetAgent = users.find((u) => u.id === selectedAgentId);

  if (isFeatureBlocked) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-10">
        <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-sm text-center flex flex-col items-center justify-center gap-6 relative overflow-hidden min-h-[450px]">
          {/* Radial gradient background accent */}
          <div className="absolute top-[-50%] right-[-10%] w-[50%] h-[150%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(124,58,237,0.15)] shrink-0 animate-pulse">
            <MessageSquare size={32} />
          </div>

          <div className="space-y-2 max-w-md">
            <span className="text-[10px] font-extrabold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full uppercase tracking-wider">
              Recurso Exclusivo Plano Pro
            </span>
            <h2 className="text-xl font-bold text-slate-800 pt-2">Chat Interno Corporativo</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              O módulo de chat interno foi desenhado para facilitar a colaboração direta, compartilhamento de notas de leads, e suporte em tempo real entre atendentes e supervisores da sua equipe.
            </p>
          </div>

          <div className="border-t border-slate-100 w-full max-w-sm pt-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 justify-center text-[10.5px] font-bold text-slate-500">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Sua assinatura atual: <span className="uppercase text-slate-700">{activeTenant?.plan}</span></span>
            </div>
            
            <button
              onClick={() => router.push('/billing')}
              className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md shadow-primary/20 hover:scale-[1.02] flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
            >
              <span>Fazer Upgrade para Plano Pro</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sync internal chat messages from the database
  const fetchMessages = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await fetch('/api/chat-interno');
      const data = await res.json();
      if (res.ok && data.success) {
        setChatLogs(data.data);
      }
    } catch (err) {
      console.error('Error fetching internal messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(true);

    // Periodic synchronization to check for new messages from team members
    const interval = setInterval(() => {
      fetchMessages(false);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedAgentId, chatLogs]);

  // Filter messages between current user and target agent
  const conversationMessages = chatLogs.filter(
    (m) =>
      (m.senderId === currentUserId && m.receiverId === selectedAgentId) ||
      (m.senderId === selectedAgentId && m.receiverId === currentUserId)
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim() || !selectedAgentId) return;

    const bodyText = msgText.trim();
    setMsgText('');

    // Optimistic UI update
    const tempMsg: InternalMessage = {
      id: `int-temp-${Date.now()}`,
      senderId: currentUserId,
      receiverId: selectedAgentId,
      body: bodyText,
      createdAt: new Date().toISOString()
    };

    setChatLogs((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch('/api/chat-interno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedAgentId,
          body: bodyText
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Replace temp msg with real database message
        setChatLogs((prev) => prev.map(m => m.id === tempMsg.id ? data.data : m));
      } else {
        // Fallback on error
        fetchMessages(false);
      }
    } catch (err) {
      console.error('Error sending internal message:', err);
      fetchMessages(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex border border-slate-200 rounded-3xl bg-white shadow-sm overflow-hidden animate-in fade-in duration-150">
      {/* COLUMN 1: AGENTS LIST */}
      <div className="w-64 border-r border-slate-200 bg-slate-50/70 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 bg-white">
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 block mb-2">
            Equipe Online
          </span>
          <p className="text-[10px] text-slate-400">Clique em um colega para iniciar o chat interno:</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {users
            .filter((u) => u.id !== currentUserId)
            .map((user) => {
              const isSelected = user.id === selectedAgentId;
              return (
                <div
                  key={user.id}
                  onClick={() => setSelectedAgentId(user.id)}
                  className={`p-3 rounded-2xl cursor-pointer hover:bg-slate-200/50 transition-all flex items-center justify-between ${
                    isSelected ? 'bg-primary/10 text-primary border-l-4 border-l-primary' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/20 shrink-0"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block leading-tight">{user.name}</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{user.role}</span>
                    </div>
                  </div>

                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    user.isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-300'
                  }`} />
                </div>
              );
            })}
        </div>
      </div>

      {/* COLUMN 2: VIEWPORT */}
      <div className="flex-1 bg-slate-50 flex flex-col min-w-0">
        {selectedAgentId && targetAgent ? (
          <>
            {/* Header */}
            <div className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={targetAgent.avatarUrl}
                  alt={targetAgent.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{targetAgent.name}</h4>
                  <span className="text-[9px] text-slate-400 block mt-0.5 capitalize">
                    {targetAgent.role} • {targetAgent.isOnline ? 'online' : 'offline'}
                  </span>
                </div>
              </div>

              <div className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                Chat Corporativo Criptografado
              </div>
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-100/30">
              {conversationMessages.map((m) => {
                const isMe = m.senderId === currentUserId;
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-2xl shadow-sm text-xs relative ${
                      isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-white text-slate-800 border rounded-tl-none border-slate-200'
                    }`}>
                      <p className="leading-relaxed">{m.body}</p>
                      <span className={`text-[8px] block text-right mt-1.5 ${isMe ? 'text-purple-200' : 'text-slate-400'}`}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <form onSubmit={handleSend} className="bg-white border-t border-slate-200 p-4 flex gap-2 shrink-0">
              <input
                type="text"
                placeholder={`Mandar mensagem interna para ${targetAgent.name}...`}
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 text-xs outline-none focus:border-primary focus:bg-white"
              />
              <button
                type="submit"
                disabled={!msgText.trim()}
                className="bg-primary hover:bg-primary-hover text-white p-2 rounded-xl transition-all shadow-md disabled:opacity-40 cursor-pointer"
              >
                <Send size={14} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4 border">
              <MessageSquare size={24} />
            </div>
            <h4 className="text-xs font-bold text-slate-700">Comunicação Interna</h4>
            <p className="text-[10px] text-slate-400 max-w-xs mt-1 leading-relaxed">
              Troque anotações de leads ou solicite auxílio de supervisores em tempo real sem sair do HBFlow.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
